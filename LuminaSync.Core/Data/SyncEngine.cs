using System;
using System.Threading.Tasks;
using LuminaSync.Core.Models;
using Supabase;

namespace LuminaSync.Core.Data
{
    public class SyncEngine
    {
        private readonly Supabase.Client _supabaseClient;
        private bool _isInitialized = false;

        public SyncEngine(string supabaseUrl, string supabaseKey)
        {
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
        }

        public async Task SaveTemplateAsync(Template template)
        {
            await _supabaseClient.From<Template>().Upsert(template);
        }

        public async Task DeleteTemplateAsync(Template template)
        {
            await _supabaseClient.From<Template>().Delete(template);
        }

        public async Task SaveMemberAsync(Member member)
        {
            await _supabaseClient.From<Member>().Upsert(member);
        }

        public async Task DeleteMemberAsync(Member member)
        {
            await _supabaseClient.From<Member>().Delete(member);
        }

        public async Task SaveServiceAsync(Service service)
        {
            await _supabaseClient.From<Service>().Upsert(service);
        }

        public async Task DeleteServiceAsync(Service service)
        {
            await _supabaseClient.From<Service>().Delete(service);
        }

        public Supabase.Client GetSupabaseClient() => _supabaseClient;
    }
}
