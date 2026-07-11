using SQLite;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LuminaSync.Core.Models;

namespace LuminaSync.Core.Data
{
    public class LocalDatabase
    {
        private readonly SQLiteAsyncConnection _database;

        public LocalDatabase(string dbPath)
        {
            _database = new SQLiteAsyncConnection(dbPath);
        }

        public async Task InitializeAsync()
        {
            await _database.CreateTableAsync<User>();
            await _database.CreateTableAsync<Template>();
            await _database.CreateTableAsync<Member>();
            await _database.CreateTableAsync<Service>();
        }

        public Task<List<T>> GetItemsAsync<T>() where T : new()
        {
            return _database.Table<T>().ToListAsync();
        }

        public Task<T> GetItemAsync<T>(object primaryKey) where T : new()
        {
            return _database.FindAsync<T>(primaryKey);
        }

        public Task<int> SaveItemAsync<T>(T item) where T : new()
        {
            return _database.InsertOrReplaceAsync(item);
        }

        public Task<int> DeleteItemAsync<T>(T item) where T : new()
        {
            return _database.DeleteAsync(item);
        }

        public SQLiteAsyncConnection GetConnection() => _database;
    }
}
