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
                // Initialize Supabase Sync Engine
                string supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? "https://hkmmotgmfsfdxyavsozx.supabase.co";
                string supabaseKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY") ?? "sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L";

                _sync = new SyncEngine(supabaseUrl, supabaseKey);
                
                Task.Run(async () =>
                {
                    try
                    {
                        await _sync.InitializeAsync();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[App] Sync Engine Initialization failed: {ex.Message}");
                    }
                });

                // Start local Web Server
                _server = new LocalWebServer(_sync);
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