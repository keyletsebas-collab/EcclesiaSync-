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
                await InitializeAppAsync();

                try
                {
                    using var stream = await FileSystem.OpenAppPackageFileAsync("index.html");
                    using var reader = new StreamReader(stream);
                    string htmlContent = await reader.ReadToEndAsync();

                    MyWebView.Source = new HtmlWebViewSource
                    {
                        Html = htmlContent,
                        BaseUrl = "file:///android_asset/"
                    };
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[App] Failed to load local index.html string: {ex.Message}");
                    MyWebView.Source = "index.html"; // Fallback
                }
            }
        }

        private async Task InitializeAppAsync()
        {
            try
            {
                // Initialize Supabase Sync Engine
                string supabaseUrl = "https://hkmmotgmfsfdxyavsozx.supabase.co";
                string supabaseKey = "sb_publishable_Mog0DO6L05Zt6sxaeExArw_J0HZ3f6L";

                _sync = new SyncEngine(supabaseUrl, supabaseKey);

                // Await initialization of data connection before starting server
                await _sync.InitializeAsync();

                // Start local Web Server
                _server = new LocalWebServer(_sync);
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
