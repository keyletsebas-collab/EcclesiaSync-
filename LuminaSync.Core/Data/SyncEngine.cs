using System;
using System.Threading.Tasks;
using LuminaSync.Core.Models;
using Supabase;
using Supabase.Realtime;
using Supabase.Realtime.PostgresChanges;

namespace LuminaSync.Core.Data
{
    public class SyncEngine
    {
        private readonly LocalDatabase _localDb;
        private readonly Supabase.Client _supabaseClient;
        private bool _isInitialized = false;

        public SyncEngine(LocalDatabase localDb, string supabaseUrl, string supabaseKey)
        {
            _localDb = localDb;
            var options = new SupabaseOptions
            {
                AutoRefreshToken = true
            };
            _supabaseClient = new Supabase.Client(supabaseUrl, supabaseKey, options);
        }

        public async Task InitializeAsync()
        {
            if (_isInitialized) return;
            await _supabaseClient.InitializeAsync();
            _isInitialized = true;

            try
            {
                await SetupRealtimeSubscriptionsAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncEngine] Realtime sub failed: {ex.Message}");
            }

            await PullAllDataAsync();
        }

        private async Task SetupRealtimeSubscriptionsAsync()
        {
            try
            {
                await _supabaseClient.Realtime.ConnectAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncEngine] Realtime connection failed: {ex.Message}");
                return;
            }

            var tables = new[] { "users", "templates", "members", "services" };
            foreach (var table in tables)
            {
                try
                {
                    var channel = _supabaseClient.Realtime.Channel($"sync-{table}", "public", table);
                    channel.AddPostgresChangeHandler(PostgresChangesOptions.ListenType.All, (sender, change) =>
                    {
                        Task.Run(async () => {
                            await PullAllDataAsync();
                        });
                    });
                    await channel.Subscribe();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[SyncEngine] Realtime registration failed for table {table}: {ex.Message}");
                }
            }
        }

        public async Task PullAllDataAsync()
        {
            try
            {
                // Pull users
                var usersResponse = await _supabaseClient.From<User>().Get();
                if (usersResponse.Models != null)
                {
                    foreach (var user in usersResponse.Models)
                    {
                        await _localDb.SaveItemAsync(user);
                    }
                }

                // Pull templates
                var templatesResponse = await _supabaseClient.From<Template>().Get();
                if (templatesResponse.Models != null)
                {
                    foreach (var template in templatesResponse.Models)
                    {
                        await _localDb.SaveItemAsync(template);
                    }
                }

                // Pull members
                var membersResponse = await _supabaseClient.From<Member>().Get();
                if (membersResponse.Models != null)
                {
                    foreach (var member in membersResponse.Models)
                    {
                        await _localDb.SaveItemAsync(member);
                    }
                }

                // Pull services
                var servicesResponse = await _supabaseClient.From<Service>().Get();
                if (servicesResponse.Models != null)
                {
                    foreach (var service in servicesResponse.Models)
                    {
                        await _localDb.SaveItemAsync(service);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncEngine] Data pull failed: {ex.Message}");
            }
        }

        public async Task SaveTemplateAsync(Template template)
        {
            await _localDb.SaveItemAsync(template);
            try
            {
                await _supabaseClient.From<Template>().Upsert(template);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncEngine] Upsert template failed: {ex.Message}");
            }
        }

        public async Task DeleteTemplateAsync(Template template)
        {
            await _localDb.DeleteItemAsync(template);
            try
            {
                await _supabaseClient.From<Template>().Delete(template);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncEngine] Delete template failed: {ex.Message}");
            }
        }

        public async Task SaveMemberAsync(Member member)
        {
            await _localDb.SaveItemAsync(member);
            try
            {
                await _supabaseClient.From<Member>().Upsert(member);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncEngine] Upsert member failed: {ex.Message}");
            }
        }

        public async Task DeleteMemberAsync(Member member)
        {
            await _localDb.DeleteItemAsync(member);
            try
            {
                await _supabaseClient.From<Member>().Delete(member);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncEngine] Delete member failed: {ex.Message}");
            }
        }

        public async Task SaveServiceAsync(Service service)
        {
            await _localDb.SaveItemAsync(service);
            try
            {
                await _supabaseClient.From<Service>().Upsert(service);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncEngine] Upsert service failed: {ex.Message}");
            }
        }

        public async Task DeleteServiceAsync(Service service)
        {
            await _localDb.DeleteItemAsync(service);
            try
            {
                await _supabaseClient.From<Service>().Delete(service);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncEngine] Delete service failed: {ex.Message}");
            }
        }

        public Supabase.Client GetSupabaseClient() => _supabaseClient;
    }
}
