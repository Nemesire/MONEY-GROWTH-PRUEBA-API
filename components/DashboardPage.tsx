import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.tsx';
import { Modal, Button, Card, ProgressBar, Input } from './common/UIComponents.tsx';
import { IconLayout, NAV_ITEMS, IconSparkles, IconPiggyBank, IconTrophy, ACHIEVEMENT_DEFINITIONS, IconArrowUp, IconArrowDown, IconPlus, IconTrash, IconX, IconAcademicCap } from '../constants.tsx';
import { Alert, WidgetType, Transaction, TransactionType, FinancialSimulation } from '../types.ts';
import { getAIFinancialSummary } from '../services/geminiService.ts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, ReferenceLine } from 'recharts';

// --- WIDGET COMPONENTS ---

const ComprehensiveFinancialSummaryWidget: React.FC = () => {
    const { getExpandedTransactionsForYear } = useApp();
    
    const getInitialDates = () => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
        };
    };

    const [dateRange, setDateRange] = useState(getInitialDates());

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDateRange(prev => ({ ...prev, [name]: value }));
    };

    const summaryData = useMemo(() => {
        const now = new Date();
        const currentUTCYear = now.getUTCFullYear();
        const lastYear = currentUTCYear - 1;

        const allTransactions = [
            ...getExpandedTransactionsForYear(currentUTCYear),
            ...getExpandedTransactionsForYear(lastYear)
        ];

        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const data: any[] = [];
        const currentUTCMonth = now.getUTCMonth();

        for (let i = 4; i >= 0; i--) {
            const targetMonth = currentUTCMonth - i;
            const date = new Date(Date.UTC(currentUTCYear, targetMonth, 1));
            const year = date.getUTCFullYear();
            const month = date.getUTCMonth();

            const monthlyTransactions = allTransactions.filter(t => {
                if (t.isExcluded) return false;
                const tDate = new Date(t.date + 'T00:00:00Z');
                return tDate.getUTCFullYear() === year && tDate.getUTCMonth() === month;
            });

            const income = monthlyTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
            const expenses = monthlyTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

            data.push({
                name: monthNames[month],
                Ingresos: income,
                Gastos: expenses,
                Ahorro: income - expenses,
            });
        }

        let accumulatedSavings = 0;
        const lineChartData = data.map(monthData => {
            accumulatedSavings += monthData.Ahorro;
            return { ...monthData, "Ahorro acumulado": accumulatedSavings };
        });

        const startDate = new Date(dateRange.start + 'T00:00:00Z');
        const endDate = new Date(dateRange.end + 'T23:59:59Z');

        const expenseDistribution = allTransactions
            .filter(t => {
                if (t.isExcluded || t.type !== TransactionType.EXPENSE) return false;
                const tDate = new Date(t.date + 'T00:00:00Z');
                return tDate >= startDate && tDate <= endDate;
            })
            .reduce((acc, t) => {
                const category = t.category || 'Otros';
                acc[category] = (acc[category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>);

        const pieChartData = Object.entries(expenseDistribution).map(([name, value]) => ({
            name,
            value,
        }));

        return { barChartData: data, lineChartData, pieChartData };
    }, [getExpandedTransactionsForYear, dateRange]);

    const PIE_COLORS = ['#F59E0B', '#3B82F6', '#22C55E', '#f87171', '#9CA3AF'];

    return (
        <Card>
            <div className="mb-8">
                <h3 className="text-lg font-bold mb-4 text-slate-200">Distribución de Gastos</h3>
                <div className="flex gap-4 mb-6 text-xs">
                    <div className="flex flex-col gap-1">
                        <span className="text-slate-500 uppercase">Desde</span>
                        <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} className="bg-slate-700 rounded p-1 text-white border-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-slate-500 uppercase">Hasta</span>
                        <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} className="bg-slate-700 rounded p-1 text-white border-none focus:ring-1 focus:ring-primary" />
                    </div>
                </div>
                 {summaryData.pieChartData.length > 0 ? (
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={summaryData.pieChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                                    {summaryData.pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                 ) : (
                    <p className="text-center py-10 text-slate-500">No hay datos para este periodo.</p>
                 )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase">Ingresos vs Gastos</h4>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summaryData.barChartData}>
                                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px' }} />
                                <Bar dataKey="Ingresos" fill="#4ade80" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Gastos" fill="#f87171" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                 <div>
                    <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase">Ahorro Acumulado</h4>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={summaryData.lineChartData}>
                                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="Ahorro acumulado" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const CurrentMonthTrendsWidget: React.FC = () => {
    const { getExpandedTransactionsForYear } = useApp();

    const trendsData = useMemo(() => {
        const today = new Date();
        const year = today.getUTCFullYear();
        const month = today.getUTCMonth();
        
        const startDate = new Date(Date.UTC(year, month, 1));
        const endDate = new Date(Date.UTC(year, month + 1, 0));
        
        const allTransactions = getExpandedTransactionsForYear(year);
        const dailyNet: Record<string, number> = {};

        allTransactions.forEach(t => {
            if (t.isExcluded) return;
            const tDate = new Date(t.date + 'T00:00:00Z');
            if (tDate.getUTCMonth() === month) {
                const day = tDate.getUTCDate();
                if (!dailyNet[day]) dailyNet[day] = 0;
                if (t.type === TransactionType.INCOME) dailyNet[day] += t.amount;
                else if (t.type === TransactionType.EXPENSE) dailyNet[day] -= t.amount;
            }
        });

        const data = [];
        let runningBalance = 0;
        for (let d = 1; d <= endDate.getUTCDate(); d++) {
            runningBalance += (dailyNet[d] || 0);
            data.push({ day: d, balance: runningBalance });
        }
        return data;
    }, [getExpandedTransactionsForYear]);

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4">Balance Diario (Mes Actual)</h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendsData}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px' }} />
                        <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="balance" stroke="#22d3ee" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={3} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

const AIFinancialSummaryWidget: React.FC = () => {
    const { transactions } = useApp();
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateSummary = async () => {
        setIsLoading(true);
        const result = await getAIFinancialSummary(transactions);
        setSummary(result);
        setIsLoading(false);
    };

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <IconSparkles className="w-5 h-5 text-primary" />
                Resumen Inteligente
            </h3>
            {summary ? (
                <div className="text-slate-300 text-sm leading-relaxed mb-4">{summary}</div>
            ) : (
                <p className="text-slate-500 text-sm mb-4">Pulsa para analizar tus movimientos recientes con IA.</p>
            )}
            <Button variant="ghost" size="sm" onClick={handleGenerateSummary} disabled={isLoading} className="w-full border border-slate-700">
                {isLoading ? 'Analizando...' : 'Actualizar con IA'}
            </Button>
        </Card>
    );
};

const AlertsWidget: React.FC = () => {
    const { alerts } = useApp();
    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4">Alertas Próximas</h3>
            {alerts.length > 0 ? (
                <ul className="space-y-3">
                    {alerts.slice(0, 3).map(alert => (
                        <li key={alert.id} className="p-3 bg-slate-700/50 rounded-lg border-l-4 border-accent">
                            <p className="font-semibold text-white text-sm">{alert.title}</p>
                            <p className="text-xs text-slate-400 mt-1">Vence: {new Date(alert.date).toLocaleDateString()}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-slate-500 text-sm text-center py-6 italic">No hay alertas pendientes.</p>
            )}
        </Card>
    );
}

const GoalsWidget: React.FC = () => {
    const { goals } = useApp();
    const sortedGoals = useMemo(() => [...goals].sort((a, b) => (b.currentAmount/b.targetAmount) - (a.currentAmount/a.targetAmount)), [goals]);

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4">Progreso de Metas</h3>
            {sortedGoals.length > 0 ? (
                <div className="space-y-4">
                    {sortedGoals.slice(0, 3).map(goal => {
                        const progress = (goal.currentAmount / goal.targetAmount) * 100;
                        return (
                            <div key={goal.id}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-300 font-medium truncate max-w-[150px]">{goal.name}</span>
                                    <span className="text-primary font-bold">{progress.toFixed(0)}%</span>
                                </div>
                                <ProgressBar value={Math.min(progress, 100)} colorClass="bg-secondary" />
                            </div>
                        );
                    })}
                    <NavLink to="/goals" className="text-xs text-primary hover:underline block text-center mt-2">Ver todas las metas</NavLink>
                </div>
            ) : (
                <p className="text-slate-500 text-sm text-center py-6 italic">No has definido metas.</p>
            )}
        </Card>
    );
};

const SavingsSummaryWidget: React.FC = () => {
    const { transactions } = useApp();
    const savingsBalance = useMemo(() => {
        return transactions.reduce((acc, t) => {
            if (t.type === TransactionType.SAVING) return acc + t.amount;
            if (t.category === 'Retiro de Ahorros') return acc - t.amount;
            return acc;
        }, 0);
    }, [transactions]);

    return (
        <Card className="flex flex-col items-center justify-center text-center">
            <IconPiggyBank className="w-10 h-10 text-info mb-2" />
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Ahorro Total</p>
            <p className="text-3xl font-bold text-white mt-1">€{savingsBalance.toLocaleString()}</p>
            <NavLink to="/goals?view=savings" className="text-xs text-primary mt-4 hover:underline">Gestionar ahorros</NavLink>
        </Card>
    );
};

const FIRETrackerWidget: React.FC = () => {
    const navigate = useNavigate();
    const { financialSimulations, updateFinancialSimulation } = useApp();
    const [selectedSimId, setSelectedSimId] = useState<string>('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [contributionAmount, setContributionAmount] = useState('');

    useEffect(() => {
        if (financialSimulations.length > 0 && !selectedSimId) {
            setSelectedSimId(financialSimulations[0].id);
        }
    }, [financialSimulations, selectedSimId]);

    const activeSimulation = useMemo(() => financialSimulations.find(s => s.id === selectedSimId), [financialSimulations, selectedSimId]);

    const fireData = useMemo(() => {
        if (!activeSimulation) return { current: 0, target: 0, progress: 0 };
        const current = activeSimulation.currentAmount;
        const monthlyLifestyleCost = activeSimulation.monthlyIncome * 0.80;
        const annualLifestyleCost = monthlyLifestyleCost * 12;
        const futureAnnualCost = annualLifestyleCost * Math.pow(1 + (activeSimulation.inflationRate / 100), activeSimulation.projectionYears);
        const target = futureAnnualCost * 25; 
        const progress = target > 0 ? (current / target) * 100 : 0;
        return { current, target, progress };
    }, [activeSimulation]);

    const handleAddContribution = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(contributionAmount);
        if (activeSimulation && !isNaN(amount) && amount > 0) {
            updateFinancialSimulation({ ...activeSimulation, currentAmount: activeSimulation.currentAmount + amount });
            setContributionAmount('');
            setIsAddModalOpen(false);
        }
    };

    if (financialSimulations.length === 0) return null;

    return (
        <Card>
            <div className="flex justify-between items-start mb-2">
                <h3 
                    className="text-lg font-bold text-white flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate('/financial-freedom')}
                    title="Ir a Libertad Financiera"
                >
                    <IconAcademicCap className="w-5 h-5 text-primary" />
                    Objetivo FIRE (4%)
                </h3>
                <select value={selectedSimId} onChange={(e) => setSelectedSimId(e.target.value)} className="bg-slate-700 text-xs rounded border-none text-slate-300 p-1">
                    {financialSimulations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <p className="text-xs text-slate-400 mb-4 italic leading-relaxed">
                Esta es la cantidad que necesitas tener invertida para que el 4% de rendimiento anual cubra tu estilo de vida futuro.
            </p>
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Portfolio</span>
                        <p className="text-2xl font-bold text-secondary">€{fireData.current.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase font-bold">Meta</span>
                        <p className="text-lg font-semibold text-white">€{fireData.target.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-400">Progreso total</span>
                        <span className="text-primary font-bold">{fireData.progress.toFixed(2)}%</span>
                    </div>
                    <ProgressBar value={Math.min(fireData.progress, 100)} colorClass="bg-gradient-to-r from-secondary to-primary" />
                </div>
                <Button className="w-full mt-2" size="sm" onClick={() => setIsAddModalOpen(true)}>
                    <IconPlus className="w-4 h-4 mr-2" /> Añadir Aportación
                </Button>
            </div>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Aportar al Objetivo FIRE">
                <form onSubmit={handleAddContribution} className="space-y-4">
                    <p className="text-sm text-slate-400">Esta cantidad se sumará a tu progreso en la simulación <strong>{activeSimulation?.name}</strong>.</p>
                    <Input label="Importe (€)" type="number" step="0.01" value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} autoFocus required />
                    <Button type="submit" className="w-full">Confirmar</Button>
                </form>
            </Modal>
        </Card>
    );
};

const MonthlySummaryWidget: React.FC = () => {
    const { getExpandedTransactionsForYear } = useApp();
    const stats = useMemo(() => {
        const now = new Date();
        const year = now.getUTCFullYear();
        const month = now.getUTCMonth();
        const txs = getExpandedTransactionsForYear(year).filter(t => !t.isExcluded && new Date(t.date + 'T00:00:00Z').getUTCMonth() === month);
        const inc = txs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
        const exp = txs.filter(t => t.type === TransactionType.EXPENSE || t.type === TransactionType.SAVING).reduce((s, t) => s + t.amount, 0);
        return { inc, exp, bal: inc - exp };
    }, [getExpandedTransactionsForYear]);

    return (
        <Card className="grid grid-cols-3 gap-4 text-center py-8">
            <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Ingresos</p>
                <p className="text-xl font-bold text-secondary">€{stats.inc.toFixed(0)}</p>
            </div>
            <div className="border-x border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Gastos</p>
                <p className="text-xl font-bold text-danger">€{stats.exp.toFixed(0)}</p>
            </div>
            <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Balance</p>
                <p className={`text-xl font-bold ${stats.bal >= 0 ? 'text-white' : 'text-danger'}`}>€{stats.bal.toFixed(0)}</p>
            </div>
        </Card>
    );
};

const AnnualPaymentsWidget: React.FC = () => {
    const { receipts, insurancePolicies } = useApp();
    const upcoming = useMemo(() => {
        const now = new Date();
        const next12Months = new Date(); next12Months.setFullYear(now.getFullYear() + 1);
        const r = receipts.filter(r => r.frequency === 'annually' && new Date(r.date) >= now && new Date(r.date) <= next12Months).map(i => ({n: i.title, d: i.date, a: i.amount}));
        const p = insurancePolicies.filter(p => p.paymentFrequency === 'annually' && new Date(p.renewalDate) >= now && new Date(p.renewalDate) <= next12Months).map(i => ({n: i.name, d: i.renewalDate, a: i.premium}));
        return [...r, ...p].sort((a,b) => new Date(a.d).getTime() - new Date(b.d).getTime()).slice(0, 4);
    }, [receipts, insurancePolicies]);

    return (
        <Card>
            <h3 className="text-lg font-bold text-white mb-4">Pagos Anuales Próximos</h3>
            <div className="space-y-3">
                {upcoming.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm p-2 bg-slate-700/30 rounded border border-slate-700">
                        <div>
                            <p className="text-white font-medium truncate max-w-[120px]">{item.n}</p>
                            <p className="text-[10px] text-slate-500">{new Date(item.d).toLocaleDateString()}</p>
                        </div>
                        <p className="font-bold text-danger">€{item.a.toFixed(2)}</p>
                    </div>
                ))}
                {upcoming.length === 0 && <p className="text-center text-slate-500 text-xs py-4">Sin pagos anuales en 12 meses.</p>}
            </div>
        </Card>
    );
};

const AchievementsWidget: React.FC = () => {
    const { achievements } = useApp();
    const progress = (achievements.length / ACHIEVEMENT_DEFINITIONS.length) * 100;
    return (
        <Card className="flex flex-col items-center justify-center">
            <IconTrophy className="w-10 h-10 text-primary mb-2" />
            <p className="text-xs text-slate-500 uppercase font-bold">Nivel de Logros</p>
            <p className="text-2xl font-bold text-white mt-1">{achievements.length} / {ACHIEVEMENT_DEFINITIONS.length}</p>
            <div className="w-full mt-4">
                <ProgressBar value={progress} colorClass="bg-primary" />
            </div>
        </Card>
    );
};

// --- WIDGET REGISTRY ---

const WIDGET_DEFINITIONS: Record<WidgetType, { component: React.FC, name: string, cols: number }> = {
    [WidgetType.FINANCIAL_SUMMARY]: { component: ComprehensiveFinancialSummaryWidget, name: "Resumen Financiero", cols: 3 },
    [WidgetType.MONTHLY_SUMMARY]: { component: MonthlySummaryWidget, name: "Resumen Mes", cols: 3 },
    [WidgetType.FIRE_TRACKER]: { component: FIRETrackerWidget, name: "Rastreador FIRE", cols: 1 },
    [WidgetType.AI_SUMMARY]: { component: AIFinancialSummaryWidget, name: "Resumen IA", cols: 1 },
    [WidgetType.GOALS]: { component: GoalsWidget, name: "Metas", cols: 1 },
    [WidgetType.SAVINGS_SUMMARY]: { component: SavingsSummaryWidget, name: "Ahorro Total", cols: 1 },
    [WidgetType.ALERTS]: { component: AlertsWidget, name: "Alertas", cols: 1 },
    [WidgetType.ANNUAL_PAYMENTS]: { component: AnnualPaymentsWidget, name: "Pagos Anuales", cols: 1 },
    [WidgetType.ACHIEVEMENTS]: { component: AchievementsWidget, name: "Logros", cols: 1 },
    [WidgetType.EXPENSE_DISTRIBUTION]: { component: () => null, name: "Distribución (Obs.)", cols: 1 }, // Deprecated or internal
};

const AVAILABLE_SHORTCUTS = [
  ...NAV_ITEMS.filter(item => item.type !== 'divider' && item.href),
  { href: '/accounting?view=monthly', label: 'Contabilidad Mensual', icon: NAV_ITEMS.find(i=>i.label==='Contabilidad')!.icon},
  { href: '/accounting?view=annual', label: 'Contabilidad Anual', icon: NAV_ITEMS.find(i=>i.label==='Contabilidad')!.icon},
];

// --- MODALS ---

const WidgetsConfigModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { dashboardWidgets, updateDashboardWidgets } = useApp();
    const [active, setActive] = useState<WidgetType[]>([]);

    useEffect(() => { if (isOpen) setActive(dashboardWidgets); }, [dashboardWidgets, isOpen]);

    const handleToggle = (w: WidgetType) => {
        setActive(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);
    };

    const handleMove = (idx: number, dir: 'u' | 'd') => {
        const next = [...active];
        const target = dir === 'u' ? idx - 1 : idx + 1;
        if (target >= 0 && target < next.length) {
            [next[idx], next[target]] = [next[target], next[idx]];
            setActive(next);
        }
    };

    const handleSave = () => { updateDashboardWidgets(active); onClose(); };

    const hidden = Object.keys(WIDGET_DEFINITIONS).filter(w => !active.includes(w as WidgetType)) as WidgetType[];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestionar Panel de Control" size="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase">Visibles y Orden</h4>
                    <div className="space-y-2">
                        {active.map((w, i) => (
                            <div key={w} className="flex items-center justify-between p-2 bg-slate-700 rounded-lg">
                                <span className="text-xs font-medium text-white truncate max-w-[100px]">{WIDGET_DEFINITIONS[w].name}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => handleMove(i, 'u')} disabled={i===0} className="p-1 text-slate-400 disabled:opacity-20"><IconArrowUp className="w-3 h-3"/></button>
                                    <button onClick={() => handleMove(i, 'd')} disabled={i===active.length-1} className="p-1 text-slate-400 disabled:opacity-20"><IconArrowDown className="w-3 h-3"/></button>
                                    <button onClick={() => handleToggle(w)} className="p-1 text-danger"><IconX className="w-3 h-3"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase">Disponibles</h4>
                    <div className="flex flex-wrap gap-2">
                        {hidden.map(w => (
                            <button key={w} onClick={() => handleToggle(w)} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-[10px] text-slate-300 hover:border-primary">
                                + {WIDGET_DEFINITIONS[w].name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-end mt-8 border-t border-slate-700 pt-4">
                <Button variant="ghost" onClick={onClose} className="mr-2">Cancelar</Button>
                <Button onClick={handleSave}>Guardar Cambios</Button>
            </div>
        </Modal>
    );
};

// --- MAIN PAGE ---

const DashboardPage: React.FC = () => {
    const { activeViewTarget, dashboardShortcuts, dashboardWidgets } = useApp();
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const activeShortcutItems = useMemo(() => dashboardShortcuts.map(h => AVAILABLE_SHORTCUTS.find(s => s.href === h)).filter(Boolean), [dashboardShortcuts]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl md:text-3xl font-bold text-white truncate max-w-[70%]">Dashboard de {activeViewTarget?.name || 'Usuario'}</h1>
                <Button variant="ghost" size="sm" onClick={() => setIsConfigOpen(true)} className="border border-slate-700">
                    <IconLayout className="w-4 h-4 mr-2"/> Personalizar
                </Button>
            </div>

            {activeShortcutItems.length > 0 && (
                <div className="flex overflow-x-auto no-scrollbar gap-3 pb-2">
                    {activeShortcutItems.map(s => s && (
                        <NavLink key={s.href} to={s.href!} className="flex-shrink-0 flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-full text-xs font-semibold border border-slate-700 transition-colors">
                            <s.icon className="w-4 h-4 text-primary" />
                            <span>{s.label}</span>
                        </NavLink>
                    ))}
                </div>
            )}

            <CurrentMonthTrendsWidget />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboardWidgets.map(type => {
                    const Def = WIDGET_DEFINITIONS[type];
                    if (!Def) return null;
                    const Component = Def.component;
                    return (
                        <div key={type} className={Def.cols === 3 ? "lg:col-span-3" : Def.cols === 2 ? "lg:col-span-2" : "lg:col-span-1"}>
                            <Component />
                        </div>
                    );
                })}
            </div>

            <WidgetsConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
        </div>
    );
};

export default DashboardPage;