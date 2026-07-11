using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Storage;
using LuminaSync.Core.Data;
using LuminaSync.Core.Network;

namespace LuminaSync.Maui
{
    public partial class MainPage : ContentPage
    {
        private LocalDatabase? _db;
        private SyncEngine? _sync;
        private LocalWebServer? _server;

        private bool _isInitialized = false;

        public MainPage()
        {
            InitializeComponent();
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            if (!_isInitialized)
            {
                _isInitialized = true;
                InitializeApp();

                try
                {
                    using var stream = await FileSystem.OpenAppPackageFileAsync("index.html");
                    using var reader = new StreamReader(stream);
                    string htmlContent = await reader.ReadToEndAsync();

                    MyWebView.Source = new HtmlWebViewSource
                    {
                        Html = htmlContent,
                        BaseUrl = "file:///android_asset/Resources/Raw/"
                    };
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[App] Failed to load local index.html string: {ex.Message}");
                    MyWebView.Source = "index.html"; // Fallback
                }
            }
        }

        private void InitializeApp()
        {
            try
            {
                // 1. Establish SQLite DB path
                string folderPath = FileSystem.AppDataDirectory;
                string dbPath = Path.Combine(folderPath, "church_cache.db");

                // 2. Initialize Database
                _db = new LocalDatabase(dbPath);

                // 3. Initialize Supabase Sync Engine
                string supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? "https://placeholder-url.supabase.co";
                string supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY") ?? "placeholder-key";

                _sync = new SyncEngine(_db, supabaseUrl, supabaseKey);
                
                Task.Run(async () =>
                {
                    try
                    {
                        await _db.InitializeAsync();
                        await _sync.InitializeAsync();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[App] Initialization failed: {ex.Message}");
                    }
                });

                // 4. Start local Web Server
                _server = new LocalWebServer(_db, _sync);
                _server.Start();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[App] Initialization failed: {ex.Message}");
            }
        }

        protected override void OnHandlerChanged()
        {
            base.OnHandlerChanged();
            if (Handler == null)
            {
                _server?.Stop();
            }
        }
    }
}
