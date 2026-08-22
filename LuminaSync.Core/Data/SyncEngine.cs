using System;
using System.Threading.Tasks;
using LuminaSync.Core.Models;
using Supabase;
using Service = LuminaSync.Core.Models.Service;

namespace LuminaSync.Core.Data;

public class SyncEngine
{
    private readonly Supabase.Client _supabaseClient;
    private bool _isInitialized = false;

    public SyncEngine(string supabaseUrl, string supabaseKey)
    {
        var options = new Supabase.SupabaseOptions
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

    public Task SaveTemplateAsync(Template template)
    {
        return _supabaseClient.From<Template>().Upsert(template);
    }

    public Task DeleteTemplateAsync(Template template)
    {
        return _supabaseClient.From<Template>().Delete(template);
    }

    public Task SaveMemberAsync(Member member)
    {
        return _supabaseClient.From<Member>().Upsert(member);
    }

    public Task DeleteMemberAsync(Member member)
    {
        return _supabaseClient.From<Member>().Delete(member);
    }

    public Task SaveServiceAsync(Service service)
    {
        return _supabaseClient.From<Service>().Upsert(service);
    }

    public Task DeleteServiceAsync(Service service)
    {
        return _supabaseClient.From<Service>().Delete(service);
    }

    public Supabase.Client GetSupabaseClient() => _supabaseClient;
}
