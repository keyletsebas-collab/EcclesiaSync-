using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.Maui;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Storage;
using LuminaSync.Core.Data;
using LuminaSync.Core.Network;

#if ANDROID
using Android.App;
using Android.Content;
using Android.OS;
using AndroidX.Core.App;
#endif

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
            MyWebView.Navigating += (s, e) =>
            {
                if (e.Url != null && e.Url.StartsWith("hybrid:"))
                {
                    e.Cancel = true; // Intercept and cancel navigation

                    try
                    {
                        // Parse query parameters manually
                        var queryString = e.Url.Substring(e.Url.IndexOf('?') + 1);
                        var title = "";
                        var body = "";

                        var parts = queryString.Split('&');
                        foreach (var part in parts)
                        {
                            var kv = part.Split('=');
                            if (kv.Length == 2)
                            {
                                var key = Uri.UnescapeDataString(kv[0]);
                                var val = Uri.UnescapeDataString(kv[1]);
                                if (key == "title") title = val;
                                if (key == "body") body = val;
                            }
                        }

                        ShowLocalNotification(title, body);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[MainPage] Error parsing custom hybrid link: {ex.Message}");
                    }
                }
            };
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            if (!_isInitialized)
            {
                _isInitialized = true;
                
                // Start initialization in the background without blocking the UI thread
                _ = InitializeAppAsync();





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

                // Start local Web Server immediately so the WebView can load and connect to health check
                _server = new LocalWebServer(_sync);
                _server.Start();

                // Initialize Supabase connection in the background without blocking the local web server start
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _sync.InitializeAsync();
                        Console.WriteLine("[App] Supabase SyncEngine initialized successfully in background.");
                    }
                    catch (Exception syncEx)
                    {
                        Console.WriteLine($"[App] Supabase SyncEngine background initialization failed: {syncEx.Message}");
                    }
                });
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

        private async void ShowLocalNotification(string title, string body)
        {
#if ANDROID
            try
            {
                // Request notification permission asynchronously before showing it
                try
                {
                    var status = await Permissions.CheckStatusAsync<Permissions.PostNotifications>();
                    if (status != PermissionStatus.Granted)
                    {
                        await Permissions.RequestAsync<Permissions.PostNotifications>();
                    }
                }
                catch (Exception pEx)
                {
                    Console.WriteLine($"[MainPage] Permission request failed: {pEx.Message}");
                }

                var context = Microsoft.Maui.ApplicationModel.Platform.CurrentActivity ?? Microsoft.Maui.ApplicationModel.Platform.AppContext;
                if (context == null) return;

                var channelId = "verbumsync_channel";
                var notificationId = new Random().Next(1, 100000);

                var manager = (Android.App.NotificationManager?)context.GetSystemService(Android.Content.Context.NotificationService);

                if (Android.OS.Build.VERSION.SdkInt >= Android.OS.BuildVersionCodes.O)
                {
                    var channel = new Android.App.NotificationChannel(channelId, "Notificaciones VerbumSync", Android.App.NotificationImportance.High)
                    {
                        Description = "Notificaciones de la aplicación"
                    };
                    manager?.CreateNotificationChannel(channel);
                }

                var intent = context.PackageManager?.GetLaunchIntentForPackage(context.PackageName ?? string.Empty);
                var pendingIntent = Android.App.PendingIntent.GetActivity(context, 0, intent, Android.App.PendingIntentFlags.UpdateCurrent | Android.App.PendingIntentFlags.Immutable);

                int iconId = context.Resources != null ? context.Resources.GetIdentifier("appicon", "mipmap", context.PackageName) : 0;
                if (iconId == 0 && context.Resources != null)
                {
                    iconId = context.Resources.GetIdentifier("appicon", "drawable", context.PackageName);
                }
                if (iconId == 0)
                {
                    iconId = context.ApplicationInfo?.Icon ?? Android.Resource.Drawable.IcDialogInfo;
                }

                var builder = new Android.App.Notification.Builder(context, channelId)
                    .SetContentTitle(title)
                    .SetContentText(body)
                    .SetSmallIcon(iconId)
                    .SetAutoCancel(true)
                    .SetContentIntent(pendingIntent);

                manager?.Notify(notificationId, builder?.Build());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MainPage] Notification failed: {ex.Message}");
            }
#endif
        }
    }
}
