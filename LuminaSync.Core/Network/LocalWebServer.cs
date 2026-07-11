using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using LuminaSync.Core.Data;
using LuminaSync.Core.Models;
using System.Collections.Generic;

namespace LuminaSync.Core.Network
{
    public class LocalWebServer
    {
        private readonly HttpListener _listener;
        private readonly LocalDatabase _db;
        private readonly SyncEngine _sync;
        private readonly int _port;
        private bool _isRunning;

        public LocalWebServer(LocalDatabase db, SyncEngine sync, int port = 3001)
        {
            _db = db;
            _sync = sync;
            _port = port;
            _listener = new HttpListener();
            
            try
            {
                _listener.Prefixes.Add($"http://127.0.0.1:{_port}/");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WebServer] Warning: Failed to add 127.0.0.1 prefix: {ex.Message}");
            }

            try
            {
                _listener.Prefixes.Add($"http://localhost:{_port}/");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WebServer] Warning: Failed to add localhost prefix: {ex.Message}");
            }
        }

        public void Start()
        {
            if (_isRunning) return;
            _isRunning = true;
            _listener.Start();
            Console.WriteLine($"[WebServer] Local API server started on http://localhost:{_port}/");
            Task.Run(ListenLoop);
        }

        public void Stop()
        {
            _isRunning = false;
            _listener.Stop();
        }

        private async Task ListenLoop()
        {
            while (_isRunning)
            {
                try
                {
                    var context = await _listener.GetContextAsync();
                    _ = Task.Run(() => HandleRequestAsync(context));
                }
                catch (Exception ex)
                {
                    if (!_isRunning) break;
                    Console.WriteLine($"[WebServer] Connection exception: {ex.Message}");
                }
            }
        }

        private async Task HandleRequestAsync(HttpListenerContext context)
        {
            var req = context.Request;
            var res = context.Response;

            // CORS headers
            res.Headers.Add("Access-Control-Allow-Origin", "*");
            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");

            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = (int)HttpStatusCode.OK;
                res.Close();
                return;
            }

            string path = req.Url?.AbsolutePath ?? "";
            string method = req.HttpMethod;
            string responseBody = "";
            res.ContentType = "application/json";

            try
            {
                string requestBody = "";
                using (var reader = new StreamReader(req.InputStream, req.ContentEncoding))
                {
                    requestBody = await reader.ReadToEndAsync();
                }

                // --- ROUTING ---
                if (path == "/api/health" && method == "GET")
                {
                    responseBody = JsonConvert.SerializeObject(new { status = "ok" });
                }
                else if (path == "/api/config" && method == "GET")
                {
                    string supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? "https://placeholder-url.supabase.co";
                    string supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY") ?? "placeholder-key";
                    responseBody = JsonConvert.SerializeObject(new {
                        supabaseUrl,
                        supabaseAnonKey = supabaseKey
                    });
                }
                // --- AUTH ---
                else if (path == "/api/auth/signup" && method == "POST")
                {
                    var payload = JsonConvert.DeserializeObject<SignupRequest>(requestBody);
                    if (payload == null) throw new ArgumentException("Invalid body");

                    var users = await _db.GetItemsAsync<User>();
                    var exists = users.Find(u => u.Username.Equals(payload.username, StringComparison.OrdinalIgnoreCase));
                    if (exists != null)
                    {
                        res.StatusCode = (int)HttpStatusCode.BadRequest;
                        responseBody = JsonConvert.SerializeObject(new { success = false, error = "Username already exists" });
                    }
                    else
                    {
                        string accountId = string.IsNullOrEmpty(payload.accountId) 
                            ? Guid.NewGuid().ToString().Substring(0, 8).ToUpper() 
                            : payload.accountId.Trim().ToUpper();

                        string uid = Guid.NewGuid().ToString();

                        var user = new User
                        {
                            Uid = uid,
                            Username = payload.username.ToLower().Trim(),
                            Password = payload.password,
                            IsMaster = payload.isMaster,
                            AccountId = accountId,
                            CreatedAt = DateTime.UtcNow,
                            IsBlocked = false,
                            memberships = JsonConvert.SerializeObject(new[] {
                                new { id = accountId, role = payload.isMaster ? "master" : "editor", expiresAt = (string?)null }
                            })
                        };

                        await _sync.SaveTemplateAsync(new Template { Id = Guid.NewGuid().ToString(), AccountId = accountId, Name = "General", CustomFields = "[]" });
                        // Add user using SyncEngine (upsert to Supabase)
                        await _localDbSaveAndSupabaseUpsert(user);

                        responseBody = JsonConvert.SerializeObject(new { 
                            success = true, 
                            accountId, 
                            username = user.Username, 
                            isMaster = user.IsMaster, 
                            uid = user.Uid,
                            memberships = new[] { new { id = accountId, role = user.IsMaster ? "master" : "editor", expiresAt = (string?)null } }
                        });
                    }
                }
                else if (path == "/api/auth/login" && method == "POST")
                {
                    var payload = JsonConvert.DeserializeObject<LoginRequest>(requestBody);
                    if (payload == null) throw new ArgumentException("Invalid body");

                    var users = await _db.GetItemsAsync<User>();
                    var user = users.Find(u => u.Username.Equals(payload.username, StringComparison.OrdinalIgnoreCase) && u.Password == payload.password);

                    if (user == null)
                    {
                        res.StatusCode = (int)HttpStatusCode.Unauthorized;
                        responseBody = JsonConvert.SerializeObject(new { success = false, error = "Invalid username or password" });
                    }
                    else if (user.IsBlocked)
                    {
                        res.StatusCode = (int)HttpStatusCode.Forbidden;
                        responseBody = JsonConvert.SerializeObject(new { success = false, error = "Account is blocked" });
                    }
                    else
                    {
                        var mList = JsonConvert.DeserializeObject<List<object>>(user.memberships) ?? new List<object>();
                        responseBody = JsonConvert.SerializeObject(new {
                            success = true,
                            username = user.Username,
                            isMaster = user.IsMaster,
                            accountId = user.AccountId,
                            uid = user.Uid,
                            memberships = mList
                        });
                    }
                }
                else if (path == "/api/auth/users" && method == "GET")
                {
                    if (await ValidateIsKeyletAsync(req, res))
                    {
                        var users = await _db.GetItemsAsync<User>();
                        responseBody = JsonConvert.SerializeObject(users);
                    }
                    else
                    {
                        responseBody = JsonConvert.SerializeObject(new { error = "Access denied" });
                    }
                }
                else if (path.StartsWith("/api/auth/users/") && method == "PUT")
                {
                    if (await ValidateIsKeyletAsync(req, res))
                    {
                        var uid = path.Substring("/api/auth/users/".Length);
                        var payload = JsonConvert.DeserializeObject<UserUpdatePayload>(requestBody);
                        if (payload == null) throw new ArgumentException("Invalid body");

                        var users = await _db.GetItemsAsync<User>();
                        var user = users.Find(u => u.Uid == uid);
                        if (user != null)
                        {
                            if (payload.isMaster != null) user.IsMaster = payload.isMaster.Value;
                            if (payload.isBlocked != null) user.IsBlocked = payload.isBlocked.Value;
                            if (payload.memberships != null) user.memberships = JsonConvert.SerializeObject(payload.memberships);

                            await _localDbSaveAndSupabaseUpsert(user);
                            responseBody = JsonConvert.SerializeObject(new { success = true });
                        }
                        else
                        {
                            res.StatusCode = (int)HttpStatusCode.NotFound;
                        }
                    }
                    else
                    {
                        responseBody = JsonConvert.SerializeObject(new { error = "Access denied" });
                    }
                }
                else if (path.StartsWith("/api/auth/users/") && method == "DELETE")
                {
                    if (await ValidateIsKeyletAsync(req, res))
                    {
                        var uid = path.Substring("/api/auth/users/".Length);
                        var users = await _db.GetItemsAsync<User>();
                        var user = users.Find(u => u.Uid == uid);
                        if (user != null)
                        {
                            await _db.DeleteItemAsync(user);
                            try
                            {
                                await _sync.GetSupabaseClient().From<User>().Delete(user);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[WebServer] Failed to delete user from Supabase: {ex.Message}");
                            }
                            responseBody = JsonConvert.SerializeObject(new { success = true });
                        }
                        else
                        {
                            res.StatusCode = (int)HttpStatusCode.NotFound;
                        }
                    }
                    else
                    {
                        responseBody = JsonConvert.SerializeObject(new { error = "Access denied" });
                    }
                }
                else if (path == "/api/auth/accounts/role" && method == "POST")
                {
                    var payload = JsonConvert.DeserializeObject<RoleUpdateRequest>(requestBody);
                    if (payload == null) throw new ArgumentException("Invalid body");

                    var users = await _db.GetItemsAsync<User>();
                    var targetUser = users.Find(u => u.Uid == payload.targetUid);
                    if (targetUser == null)
                    {
                        res.StatusCode = (int)HttpStatusCode.NotFound;
                        responseBody = JsonConvert.SerializeObject(new { error = "Target user not found" });
                    }
                    else
                    {
                        var memberships = JsonConvert.DeserializeObject<List<MembershipItem>>(targetUser.memberships) ?? new List<MembershipItem>();
                        var item = memberships.Find(m => m.id == payload.accountId);
                        if (item != null)
                        {
                            item.role = payload.role;
                            item.expiresAt = payload.expiresAt;
                        }
                        else
                        {
                            memberships.Add(new MembershipItem { id = payload.accountId, role = payload.role, expiresAt = payload.expiresAt });
                        }

                        targetUser.memberships = JsonConvert.SerializeObject(memberships);
                        await _localDbSaveAndSupabaseUpsert(targetUser);
                        responseBody = JsonConvert.SerializeObject(new { success = true });
                    }
                }
                // --- TEMPLATES ---
                else if (path == "/api/templates" && method == "GET")
                {
                    var accountId = req.QueryString["accountId"] ?? "";
                    var all = await _db.GetItemsAsync<Template>();
                    var filtered = all.FindAll(t => t.AccountId == accountId);
                    responseBody = JsonConvert.SerializeObject(filtered);
                }
                else if (path == "/api/templates" && method == "POST")
                {
                    var t = JsonConvert.DeserializeObject<Template>(requestBody);
                    if (t == null) throw new ArgumentException("Invalid body");
                    if (string.IsNullOrEmpty(t.Id)) t.Id = Guid.NewGuid().ToString();
                    t.CreatedAt = DateTime.UtcNow;

                    await _sync.SaveTemplateAsync(t);
                    responseBody = JsonConvert.SerializeObject(t);
                }
                else if (path.StartsWith("/api/templates/") && method == "DELETE")
                {
                    var id = path.Substring("/api/templates/".Length);
                    var all = await _db.GetItemsAsync<Template>();
                    var template = all.Find(t => t.Id == id);
                    if (template != null)
                    {
                        await _sync.DeleteTemplateAsync(template);
                        responseBody = JsonConvert.SerializeObject(new { success = true });
                    }
                    else
                    {
                        res.StatusCode = (int)HttpStatusCode.NotFound;
                    }
                }
                // --- MEMBERS ---
                else if (path == "/api/members" && method == "GET")
                {
                    if (await ValidateIsKeyletAsync(req, res))
                    {
                        var accountId = req.QueryString["accountId"] ?? "";
                        var all = await _db.GetItemsAsync<Member>();
                        var filtered = all.FindAll(m => m.AccountId == accountId);
                        responseBody = JsonConvert.SerializeObject(filtered);
                    }
                    else
                    {
                        responseBody = JsonConvert.SerializeObject(new { error = "Access denied" });
                    }
                }
                else if (path == "/api/members" && method == "POST")
                {
                    var m = JsonConvert.DeserializeObject<Member>(requestBody);
                    if (m == null) throw new ArgumentException("Invalid body");
                    if (string.IsNullOrEmpty(m.Id)) m.Id = Guid.NewGuid().ToString();
                    m.CreatedAt = DateTime.UtcNow;

                    await _sync.SaveMemberAsync(m);
                    responseBody = JsonConvert.SerializeObject(m);
                }
                else if (path.StartsWith("/api/members/") && method == "DELETE")
                {
                    var id = path.Substring("/api/members/".Length);
                    var all = await _db.GetItemsAsync<Member>();
                    var member = all.Find(m => m.Id == id);
                    if (member != null)
                    {
                        await _sync.DeleteMemberAsync(member);
                        responseBody = JsonConvert.SerializeObject(new { success = true });
                    }
                    else
                    {
                        res.StatusCode = (int)HttpStatusCode.NotFound;
                    }
                }
                // --- SERVICES ---
                else if (path == "/api/services" && method == "GET")
                {
                    if (await ValidateIsKeyletAsync(req, res))
                    {
                        var accountId = req.QueryString["accountId"] ?? "";
                        var all = await _db.GetItemsAsync<Service>();
                        var filtered = all.FindAll(s => s.AccountId == accountId);
                        responseBody = JsonConvert.SerializeObject(filtered);
                    }
                    else
                    {
                        responseBody = JsonConvert.SerializeObject(new { error = "Access denied" });
                    }
                }
                else if (path == "/api/services" && method == "POST")
                {
                    var s = JsonConvert.DeserializeObject<Service>(requestBody);
                    if (s == null) throw new ArgumentException("Invalid body");
                    if (string.IsNullOrEmpty(s.Id)) s.Id = Guid.NewGuid().ToString();
                    s.CreatedAt = DateTime.UtcNow;

                    await _sync.SaveServiceAsync(s);
                    responseBody = JsonConvert.SerializeObject(s);
                }
                else if (path.StartsWith("/api/services/") && method == "DELETE")
                {
                    var id = path.Substring("/api/services/".Length);
                    var all = await _db.GetItemsAsync<Service>();
                    var service = all.Find(s => s.Id == id);
                    if (service != null)
                    {
                        await _sync.DeleteServiceAsync(service);
                        responseBody = JsonConvert.SerializeObject(new { success = true });
                    }
                    else
                    {
                        res.StatusCode = (int)HttpStatusCode.NotFound;
                    }
                }
                else
                {
                    res.StatusCode = (int)HttpStatusCode.NotFound;
                    responseBody = JsonConvert.SerializeObject(new { error = "Route not found" });
                }
            }
            catch (Exception ex)
            {
                res.StatusCode = (int)HttpStatusCode.InternalServerError;
                responseBody = JsonConvert.SerializeObject(new { error = ex.Message });
            }

            byte[] buffer = Encoding.UTF8.GetBytes(responseBody);
            res.ContentLength64 = buffer.Length;
            await res.OutputStream.WriteAsync(buffer, 0, buffer.Length);
            res.Close();
        }

        private async Task<bool> ValidateIsKeyletAsync(HttpListenerRequest req, HttpListenerResponse res)
        {
            var userUid = req.Headers["X-User-Uid"] ?? req.QueryString["uid"];
            if (string.IsNullOrEmpty(userUid))
            {
                res.StatusCode = (int)HttpStatusCode.Unauthorized;
                return false;
            }

            var users = await _db.GetItemsAsync<User>();
            var user = users.Find(u => u.Uid == userUid);
            if (user == null || !user.Username.Equals("keylet", StringComparison.OrdinalIgnoreCase))
            {
                res.StatusCode = (int)HttpStatusCode.Forbidden;
                return false;
            }

            return true;
        }

        private async Task _localDbSaveAndSupabaseUpsert(User user)
        {
            await _db.SaveItemAsync(user);
            try
            {
                await _sync.GetSupabaseClient().From<User>().Upsert(user);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WebServer] Failed to push user to Supabase: {ex.Message}");
            }
        }

        // Request payloads
        private class SignupRequest
        {
            public string username { get; set; } = "";
            public string password { get; set; } = "";
            public bool isMaster { get; set; }
            public string accountId { get; set; } = "";
        }

        private class LoginRequest
        {
            public string username { get; set; } = "";
            public string password { get; set; } = "";
        }

        private class UserUpdatePayload
        {
            public bool? isMaster { get; set; }
            public bool? isBlocked { get; set; }
            public List<MembershipItem>? memberships { get; set; }
        }

        private class RoleUpdateRequest
        {
            public string masterUid { get; set; } = "";
            public string targetUid { get; set; } = "";
            public string accountId { get; set; } = "";
            public string role { get; set; } = "";
            public string? expiresAt { get; set; }
        }

        private class MembershipItem
        {
            public string id { get; set; } = "";
            public string role { get; set; } = "";
            public string? expiresAt { get; set; }
        }
    }
}
