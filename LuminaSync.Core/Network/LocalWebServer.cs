using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using LuminaSync.Core.Data;
using LuminaSync.Core.Models;
using System.Collections.Generic;
using Service = LuminaSync.Core.Models.Service;

namespace LuminaSync.Core.Network
{
    public class LocalWebServer
    {
        private readonly HttpListener _listener;
        private readonly SyncEngine _sync;
        private readonly int _port;
        private bool _isRunning;

        public LocalWebServer(SyncEngine sync, int port = 3001)
        {
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
            res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Uid");

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
                    string supabaseUrl = "https://hkmmotgmfsfdxyavsozx.supabase.co";
                    string supabaseKey = "sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L";
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

                    var response = await _sync.GetSupabaseClient().From<User>().Get();
                    var users = response.Models ?? new List<User>();
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
                        await _supabaseUserUpsert(user);

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

                    var response = await _sync.GetSupabaseClient().From<User>().Get();
                    var users = response.Models ?? new List<User>();
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
                            birthday = user.Birthday,
                            address = user.Address,
                            memberships = mList
                        });
                    }
                }
                else if (path == "/api/auth/users" && method == "GET")
                {
                    if (await ValidateIsKeyletAsync(req, res))
                    {
                        var response = await _sync.GetSupabaseClient().From<User>().Get();
                        var users = response.Models ?? new List<User>();
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

                        var response = await _sync.GetSupabaseClient().From<User>().Get();
                        var users = response.Models ?? new List<User>();
                        var user = users.Find(u => u.Uid == uid);
                        if (user != null)
                        {
                            if (payload.isMaster != null) user.IsMaster = payload.isMaster.Value;
                            if (payload.isBlocked != null) user.IsBlocked = payload.isBlocked.Value;
                            if (payload.memberships != null) user.memberships = JsonConvert.SerializeObject(payload.memberships);

                            await _supabaseUserUpsert(user);
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
                else if (path == "/api/auth/profile" && method == "PUT")
                {
                    var payload = JsonConvert.DeserializeObject<ProfileUpdatePayload>(requestBody);
                    if (payload == null || string.IsNullOrEmpty(payload.uid)) throw new ArgumentException("Invalid body");

                    var response = await _sync.GetSupabaseClient().From<User>().Get();
                    var users = response.Models ?? new List<User>();
                    var user = users.Find(u => u.Uid == payload.uid);
                    if (user != null)
                    {
                        if (payload.birthday != null) user.Birthday = payload.birthday;
                        if (payload.address != null) user.Address = payload.address;

                        await _supabaseUserUpsert(user);
                        responseBody = JsonConvert.SerializeObject(new { success = true });
                    }
                    else
                    {
                        res.StatusCode = (int)HttpStatusCode.NotFound;
                    }
                }
                else if (path.StartsWith("/api/auth/users/") && method == "DELETE")
                {
                    if (await ValidateIsKeyletAsync(req, res))
                    {
                        var uid = path.Substring("/api/auth/users/".Length);
                        var response = await _sync.GetSupabaseClient().From<User>().Get();
                        var users = response.Models ?? new List<User>();
                        var user = users.Find(u => u.Uid == uid);
                        if (user != null)
                        {
                            await _sync.GetSupabaseClient().From<User>().Delete(user);
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

                    var response = await _sync.GetSupabaseClient().From<User>().Get();
                    var users = response.Models ?? new List<User>();
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
                        await _supabaseUserUpsert(targetUser);
                        responseBody = JsonConvert.SerializeObject(new { success = true });
                    }
                }
                // --- TEMPLATES ---
                else if (path == "/api/templates" && method == "GET")
                {
                    var accountId = req.QueryString["accountId"] ?? "";
                    var response = await _sync.GetSupabaseClient().From<Template>().Get();
                    var all = response.Models ?? new List<Template>();
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
                    var response = await _sync.GetSupabaseClient().From<Template>().Get();
                    var all = response.Models ?? new List<Template>();
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
                    var accountId = req.QueryString["accountId"] ?? "";
                    if (await CheckIfSonidoAsync(accountId) || await ValidateIsKeyletAsync(req, res))
                    {
                        var response = await _sync.GetSupabaseClient().From<Member>().Get();
                        var all = response.Models ?? new List<Member>();
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
                    var response = await _sync.GetSupabaseClient().From<Member>().Get();
                    var all = response.Models ?? new List<Member>();
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
                // --- TRANSACTIONS ---
                else if (path == "/api/transactions" && method == "GET")
                {
                    var templateId = req.QueryString["templateId"] ?? "";
                    var response = await _sync.GetSupabaseClient().From<Transaction>().Get();
                    var all = response.Models ?? new List<Transaction>();
                    var filtered = string.IsNullOrEmpty(templateId) ? all : all.FindAll(t => t.TemplateId == templateId);
                    responseBody = JsonConvert.SerializeObject(filtered);
                }
                else if (path == "/api/transactions" && method == "POST")
                {
                    var tx = JsonConvert.DeserializeObject<Transaction>(requestBody);
                    if (tx == null) throw new ArgumentException("Invalid body");
                    if (string.IsNullOrEmpty(tx.Id)) tx.Id = Guid.NewGuid().ToString();
                    tx.CreatedAt = DateTime.UtcNow;

                    await _sync.GetSupabaseClient().From<Transaction>().Upsert(tx);
                    responseBody = JsonConvert.SerializeObject(tx);
                }
                else if (path.StartsWith("/api/transactions/") && method == "DELETE")
                {
                    var id = path.Substring("/api/transactions/".Length);
                    var response = await _sync.GetSupabaseClient().From<Transaction>().Get();
                    var all = response.Models ?? new List<Transaction>();
                    var tx = all.Find(t => t.Id == id);
                    if (tx != null)
                    {
                        await _sync.GetSupabaseClient().From<Transaction>().Delete(tx);
                        responseBody = JsonConvert.SerializeObject(new { success = true });
                    }
                    else
                    {
                        res.StatusCode = (int)HttpStatusCode.NotFound;
                    }
                }
                // --- PROGRAMS ---
                else if (path == "/api/programs" && method == "GET")
                {
                    var templateId = req.QueryString["templateId"] ?? "";
                    var response = await _sync.GetSupabaseClient().From<HubProgram>().Get();
                    var all = response.Models ?? new List<HubProgram>();
                    var filtered = string.IsNullOrEmpty(templateId) ? all : all.FindAll(p => p.TemplateId == templateId);
                    responseBody = JsonConvert.SerializeObject(filtered);
                }
                else if (path == "/api/programs" && method == "POST")
                {
                    var p = JsonConvert.DeserializeObject<HubProgram>(requestBody);
                    if (p == null) throw new ArgumentException("Invalid body");
                    if (string.IsNullOrEmpty(p.Id)) p.Id = Guid.NewGuid().ToString();
                    p.CreatedAt = DateTime.UtcNow;

                    await _sync.GetSupabaseClient().From<HubProgram>().Upsert(p);
                    responseBody = JsonConvert.SerializeObject(p);
                }
                else if (path.StartsWith("/api/programs/") && method == "DELETE")
                {
                    var id = path.Substring("/api/programs/".Length);
                    var response = await _sync.GetSupabaseClient().From<HubProgram>().Get();
                    var all = response.Models ?? new List<HubProgram>();
                    var p = all.Find(x => x.Id == id);
                    if (p != null)
                    {
                        await _sync.GetSupabaseClient().From<HubProgram>().Delete(p);
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
                    var accountId = req.QueryString["accountId"] ?? "";
                    if (await CheckIfSonidoAsync(accountId) || await ValidateIsKeyletAsync(req, res))
                    {
                        var response = await _sync.GetSupabaseClient().From<Service>().Get();
                        var all = response.Models ?? new List<Service>();
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
                else if (path.StartsWith("/api/services/") && method == "PUT")
                {
                    var id = path.Substring("/api/services/".Length);
                    var response = await _sync.GetSupabaseClient().From<Service>().Get();
                    var all = response.Models ?? new List<Service>();
                    var service = all.Find(s => s.Id == id);
                    if (service != null)
                    {
                        var updates = JsonConvert.DeserializeObject<ServiceUpdatePayload>(requestBody);
                        if (updates != null)
                        {
                            if (updates.serviceType != null) service.ServiceType = updates.serviceType;
                            if (updates.program != null) service.Program = updates.program;
                            if (updates.assignedMembers != null) service.AssignedMembers = updates.assignedMembers;

                            await _sync.SaveServiceAsync(service);
                            responseBody = JsonConvert.SerializeObject(new { success = true });
                        }
                    }
                    else
                    {
                        res.StatusCode = (int)HttpStatusCode.NotFound;
                    }
                }
                else if (path.StartsWith("/api/services/") && method == "DELETE")
                {
                    var id = path.Substring("/api/services/".Length);
                    var response = await _sync.GetSupabaseClient().From<Service>().Get();
                    var all = response.Models ?? new List<Service>();
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

            var response = await _sync.GetSupabaseClient().From<User>().Get();
            var users = response.Models ?? new List<User>();
            var user = users.Find(u => u.Uid == userUid);
            if (user == null)
            {
                res.StatusCode = (int)HttpStatusCode.Forbidden;
                return false;
            }

            // Unconditional allow for main admin "keylet"
            if (user.Username.Equals("keylet", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // Check if user has membership in the account
            var accountId = req.QueryString["accountId"];
            if (string.IsNullOrEmpty(accountId))
            {
                // Fallback: if no account ID requested, check if user has memberships at all
                var hasAnyMembership = false;
                try
                {
                    var mList = JsonConvert.DeserializeObject<List<MembershipItem>>(user.memberships) ?? new List<MembershipItem>();
                    hasAnyMembership = mList.Count > 0;
                }
                catch {}
                if (hasAnyMembership) return true;

                res.StatusCode = (int)HttpStatusCode.Forbidden;
                return false;
            }

            // Verify membership role
            try
            {
                var memberships = JsonConvert.DeserializeObject<List<MembershipItem>>(user.memberships) ?? new List<MembershipItem>();
                var membership = memberships.Find(m => m.id == accountId);
                if (membership != null)
                {
                    // Check expiration if set
                    if (!string.IsNullOrEmpty(membership.expiresAt) && DateTime.TryParse(membership.expiresAt, out var exp) && exp < DateTime.UtcNow)
                    {
                        res.StatusCode = (int)HttpStatusCode.Forbidden;
                        return false;
                    }

                    // Any role (master, editor, viewer) has at least read/viewer access
                    var rolesOrder = new System.Collections.Generic.Dictionary<string, int> { { "master", 3 }, { "editor", 2 }, { "viewer", 1 } };
                    var userRole = membership.role ?? "viewer";
                    if (rolesOrder.ContainsKey(userRole))
                    {
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WebServer] Error parsing user memberships in ValidateIsKeyletAsync: {ex.Message}");
            }

            res.StatusCode = (int)HttpStatusCode.Forbidden;
            return false;
        }

        private async Task<bool> CheckIfSonidoAsync(string accountId)
        {
            if (string.IsNullOrEmpty(accountId)) return false;
            var response = await _sync.GetSupabaseClient().From<Template>().Get();
            var templates = response.Models ?? new List<Template>();
            var accountTemplates = templates.FindAll(t => t.AccountId == accountId);
            return accountTemplates.Exists(t => t.CustomFields.Contains("__sonido__"));
        }

        private async Task _supabaseUserUpsert(User user)
        {
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

        private class ProfileUpdatePayload
        {
            public string uid { get; set; } = "";
            public string birthday { get; set; } = "";
            public string address { get; set; } = "";
        }

        private class ServiceUpdatePayload
        {
            public string? serviceType { get; set; }
            public string? program { get; set; }
            public string? assignedMembers { get; set; }
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
