using System;
using System.IO;
using System.Threading.Tasks;
using Avalonia.Controls;
using LuminaSync.Core.Data;
using LuminaSync.Core.Network;

namespace LuminaSync.Linux
{
    public partial class MainWindow : Window
    {
        private LocalDatabase? _db;
        private SyncEngine? _sync;
        private LocalWebServer? _server;

        public MainWindow()
        {
            InitializeComponent();
            InitializeApp();

            string appDir = AppContext.BaseDirectory;
            string indexPath = Path.Combine(appDir, "dist", "index.html");
            if (File.Exists(indexPath))
            {
                MyWebView.Source = new Uri(indexPath);
            }
            else
            {
                MyWebView.Source = new Uri("http://localhost:5173");
            }
        }

        private void InitializeApp()
        {
            try
            {
                // 1. Establish SQLite DB path
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string folderPath = Path.Combine(appData, "VerbumSync");
                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }
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

        protected override void OnClosed(EventArgs e)
        {
            _server?.Stop();
            base.OnClosed(e);
        }
    }
}