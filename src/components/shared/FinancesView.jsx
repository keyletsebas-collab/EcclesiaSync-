import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Trash2 } from 'lucide-react';

const mapTxToObj = (row) => ({
    id: row.id,
    templateId: row.template_id,
    accountId: row.account_id,
    type: row.type,
    amount: parseFloat(row.amount),
    description: row.description,
    date: row.date,
    createdAt: row.created_at
});

const FinancesView = ({ templateId, accountId, isTemplateAdmin }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('income'); // 'income' or 'expense'
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const { currentUser } = useAuth();

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('template_id', templateId);
            if (error) throw error;
            if (Array.isArray(data)) {
                setTransactions(data.map(mapTxToObj));
            }
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [templateId]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!description.trim() || !amount) return;
        try {
            const newTxId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
            const newTxRow = {
                id: newTxId,
                template_id: templateId,
                account_id: accountId,
                type,
                amount: parseFloat(amount),
                description: description.trim(),
                date
            };
            const { error } = await supabase.from('transactions').insert([newTxRow]);
            if (error) throw error;

            setDescription('');
            setAmount('');
            fetchTransactions();
        } catch (err) {
            alert('Error al agregar: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar esta transacción?')) return;
        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchTransactions();
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
    };

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    return (
        <div className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
            <h3 style={{ margin: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💵 Control de Ingresos y Egresos
            </h3>

            {/* Balances widgets */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1.25rem', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '16px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Ingresos Totales</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>${totalIncome.toFixed(2)}</span>
                </div>
                <div style={{ padding: '1.25rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Egresos Totales</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>${totalExpense.toFixed(2)}</span>
                </div>
                <div style={{ padding: '1.25rem', background: balance >= 0 ? 'rgba(99, 102, 241, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: balance >= 0 ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Balance Neto</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: balance >= 0 ? 'var(--primary)' : '#ef4444' }}>${balance.toFixed(2)}</span>
                </div>
            </div>

            {/* Admin Add Transaction Form */}
            {isTemplateAdmin ? (
                <form onSubmit={handleAdd} className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Agregar Nueva Transacción</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Descripción</label>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="Ej: Ofrenda, Compra de cables"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Monto ($)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="glass-input"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Tipo</label>
                            <select
                                className="glass-input"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                            >
                                <option value="income">Ingreso</option>
                                <option value="expense">Egreso</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Fecha</label>
                            <input
                                type="date"
                                className="glass-input"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', padding: '0.5rem 1.5rem', fontSize: '0.875rem' }}>
                        Guardar Transacción
                    </button>
                </form>
            ) : (
                <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', marginBottom: '2rem', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ℹ️ Solo los administradores pueden añadir o eliminar transacciones financieras.
                </div>
            )}

            {/* Transactions List */}
            <h4 style={{ margin: 0, marginBottom: '1rem', fontSize: '1rem' }}>Historial de Movimientos</h4>
            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Cargando transacciones...</p>
            ) : transactions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No hay transacciones registradas.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {transactions.map(tx => (
                        <div key={tx.id} style={{
                            padding: '1rem',
                            background: 'var(--bg-glass)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>{tx.description}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.date}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '1rem', color: tx.type === 'income' ? '#22c55e' : '#ef4444' }}>
                                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                                </span>
                                {isTemplateAdmin && (
                                    <button onClick={() => handleDelete(tx.id)} className="btn-danger" style={{ padding: '0.4rem', borderRadius: '6px' }}>
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FinancesView;
