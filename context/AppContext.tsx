import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { 
    AppContextType, AppState, Transaction, Credit, Receipt, Goal, ToxicityReport, 
    User, UserData, Group, ActiveView, Alert, TransactionType, InsurancePolicy, Budget,
    InsurancePolicyType, SavedTaxReturn, EducationProgress, WidgetType, PropertyInvestment, GoalContribution,
    Category, BudgetContribution, FinancialSimulation, Achievement, SavedInsight, ManualAsset, InvestmentTransaction
} from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { INSURANCE_POLICY_TYPES, PROFILE_COLORS } from '../constants.tsx';
import { saveFile, deleteFile } from '../services/geminiService.ts';

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SHORTCUTS: string[] = ['/accounting', '/receipts?view=invoice', '/credits', '/insurance', '/goals'];
const DEFAULT_WIDGETS: WidgetType[] = [
    WidgetType.FINANCIAL_SUMMARY,
    WidgetType.EXPENSE_DISTRIBUTION,
    WidgetType.AI_SUMMARY,
    WidgetType.ALERTS,
    WidgetType.MONTHLY_SUMMARY,
    WidgetType.ANNUAL_PAYMENTS,
    WidgetType.GOALS,
    WidgetType.SAVINGS_SUMMARY,
    WidgetType.FIRE_TRACKER,
];
const DEFAULT_BOTTOM_NAV_SHORTCUTS: string[] = ['/', '/accounting', '/credits', '/settings'];

const defaultUser: User = { id: crypto.randomUUID(), name: 'Usuario Principal', color: PROFILE_COLORS[0] };
const initialUserData: UserData = { 
    transactions: [], 
    credits: [], 
    receipts: [], 
    insurancePolicies: [],
    goals: [],
    budgets: [],
    dashboardShortcuts: DEFAULT_SHORTCUTS,
    dashboardWidgets: DEFAULT_WIDGETS,
    bottomNavShortcuts: DEFAULT_BOTTOM_NAV_SHORTCUTS,
    incomeCategories: [],
    expenseCategories: [],
    hiddenDefaultIncomeCategories: [],
    hiddenDefaultExpenseCategories: [],
    expenseSubcategories: {},
    invoiceCategories: [],
    insuranceSubcategories: {},
    savedTaxReturns: [],
    educationProgress: {
        completedLevel: 0,
        checklistStates: {},
        milestones: [],
    },
    excludedInstances: {},
    propertyInvestments: [],
    manualAssets: [],
    financialSimulations: [],
    investmentTransactions: [],
    achievements: [],
    savedInsights: [],
};

const initialAppState: AppState = {
    users: [defaultUser],
    groups: [],
    activeView: { type: 'user', id: defaultUser.id },
    userData: {
        [defaultUser.id]: initialUserData
    }
};

const DEFAULT_INCOME_CATEGORIES = ['Nómina', 'Freelance', 'Regalos', 'Retiro de Ahorros', 'Otros'];
const DEFAULT_EXPENSE_CATEGORIES = ['Vivienda', 'Transporte', 'Alimentación', 'Compras', 'Ocio', 'Salud', 'Cuidado Personal', 'Familia y Niños', 'Mascotas', 'Créditos', 'Finanzas', 'Seguros', 'Regalos y Donaciones', 'Otros'];
const DEFAULT_INVOICE_CATEGORIES = ['Trabajo', 'Material Oficina', 'Viajes', 'Otros'];

export const DEFAULT_EXPENSE_SUBCATEGORIES: Record<string, string[]> = {
    'Vivienda': ['Alquiler', 'Luz', 'Agua', 'Gas', 'Internet y Teléfono', 'Comunidad', 'IBI', 'Seguro de Hogar', 'Reparaciones', 'Mobiliario y Decoración', 'Alarma', 'Derrama'],
    'Transporte': ['Combustible', 'Transporte Público', 'Mantenimiento Vehículo', 'Parking', 'Peajes', 'Seguro de Vehículo', 'ITV', 'Impuesto de Circulación', 'Taxis/VTC'],
    'Alimentación': ['Supermercado', 'Restaurantes', 'Cafeterías y Bares', 'Comida a Domicilio'],
    'Compras': ['Ropa y Calzado', 'Tecnología', 'Hogar y Decoración', 'Libros y Papelería'],
    'Ocio': ['Suscripciones (Streaming, etc.)', 'Cine y Espectáculos', 'Gimnasio y Deporte', 'Vacaciones y Viajes', 'Hobbies', 'Salidas y Eventos'],
    'Salud': ['Farmacia', 'Médico', 'Seguro de Salud', 'Dentista', 'Óptica', 'Fisioterapia'],
    'Cuidado Personal': ['Peluquería y Estética', 'Productos de Higiene y Cosmética'],
    'Familia y Niños': ['Guardería/Colegio', 'Universidad', 'Actividades extraescolares', 'Juguetes y Ropa', 'Material escolar', 'Canguro'],
    'Mascotas': ['Comida', 'Veterinario', 'Accesorios', 'Peluquería canina'],
    'Créditos': ['Financiación', 'Tarjeta', 'Hipoteca', 'Préstamo'],
    'Finanzas': ['Comisiones', 'Asesoría', 'Impuestos'],
    'Seguros': ['Coche', 'Hogar', 'Vida', 'Salud', 'Otros'],
    'Regalos y Donaciones': ['Regalos', 'Donaciones ONG', 'Celebraciones'],
    'Otros': [],
};

type UserDataArrayKey = 'transactions' | 'credits' | 'receipts' | 'goals' | 'insurancePolicies' | 'budgets' | 'savedTaxReturns' | 'propertyInvestments' | 'incomeCategories' | 'expenseCategories' | 'financialSimulations' | 'investmentTransactions' | 'achievements' | 'savedInsights' | 'manualAssets';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useLocalStorage<AppState>('finanzen-app-state-v3', initialAppState);

  useEffect(() => {
    // One-time migration logic for moving file data to IndexedDB
    const needsMigration = Object.values(state.userData).some(ud => 
        ud.receipts.some(r => (r as any).contractFileData) || 
        ud.insurancePolicies.some(p => (p as any).contractFileData)
    );

    if (needsMigration) {
        console.log("Migration needed: Moving files from localStorage to IndexedDB.");
        const migrate = async () => {
            const newState: AppState = JSON.parse(JSON.stringify(state));
            let changed = false;
            for (const userId in newState.userData) {
                const userData = newState.userData[userId];
                
                for (const receipt of userData.receipts) {
                    const oldReceipt = receipt as any;
                    if (oldReceipt.contractFileData) {
                        const fileId = `receipt-${receipt.id}`;
                        await saveFile(fileId, oldReceipt.contractFileData);
                        receipt.contractFileId = fileId;
                        delete oldReceipt.contractFileData;
                        changed = true;
                    }
                }

                for (const policy of userData.insurancePolicies) {
                    const oldPolicy = policy as any;
                     if (oldPolicy.contractFileData) {
                        const fileId = `policy-${policy.id}`;
                        await saveFile(fileId, oldPolicy.contractFileData);
                        policy.contractFileId = fileId;
                        delete oldPolicy.contractFileData;
                        changed = true;
                    }
                }
            }
            if (changed) {
                console.log("Migration complete. Updating state.");
                setState(newState);
            }
        };
        migrate().catch(console.error);
    }
  }, []); // Run only once on mount

  const activeViewTarget = useMemo(() => {
    if (state.activeView.type === 'user') {
        return state.users.find(u => u.id === state.activeView.id) ?? null;
    }
    return state.groups.find(g => g.id === state.activeView.id) ?? null;
  }, [state.users, state.groups, state.activeView]);
  
  const groupMembers = useMemo(() => {
    if (state.activeView.type === 'group') {
        const group = state.groups.find(g => g.id === state.activeView.id);
        if (group) {
            return state.users.filter(u => group.userIds.includes(u.id));
        }
    }
    return [];
  }, [state.activeView, state.groups, state.users]);

  const activeUserForModification = useMemo(() => {
    if (state.activeView.type === 'user') {
        return state.users.find(u => u.id === state.activeView.id) ?? state.users[0];
    }
    // For groups, default to the first user in the app state for actions like adding categories
    // that are not assigned to a specific user.
    return state.users[0];
  }, [state.activeView, state.users]);


  const getDataForView = <T extends Exclude<UserDataArrayKey, 'incomeCategories' | 'expenseCategories'>>(dataType: T): UserData[T] => {
    if (state.activeView.type === 'user') {
        return (state.userData[state.activeView.id]?.[dataType] ?? []) as UserData[T];
    }
    const group = state.groups.find(g => g.id === state.activeView.id);
    if (!group) return [] as UserData[T];
    
    return group.userIds.flatMap(userId => {
        const items = (state.userData[userId]?.[dataType] ?? []) as any[];
        return items.map(item => ({ ...item, ownerId: userId }));
    }) as UserData[T];
  };
  
    const getObjectCategoriesForView = (categoryType: 'incomeCategories' | 'expenseCategories', defaultCategories: readonly string[]): Category[] => {
      let userIds: string[];
      if (state.activeView.type === 'user') {
          userIds = [state.activeView.id];
      } else {
          const group = state.groups.find(g => g.id === state.activeView.id);
          userIds = group ? group.userIds : [];
      }

      let hiddenDefaults: string[] = [];
        if (categoryType === 'expenseCategories') {
           hiddenDefaults = userIds.flatMap(id => state.userData[id]?.hiddenDefaultExpenseCategories ?? []);
      } else if (categoryType === 'incomeCategories') {
           hiddenDefaults = userIds.flatMap(id => state.userData[id]?.hiddenDefaultIncomeCategories ?? []);
      }

      const customCategories: Category[] = userIds.flatMap(id => state.userData[id]?.[categoryType] ?? []).filter(Boolean);

      const visibleDefaults: Category[] = defaultCategories
          .filter(catName => !hiddenDefaults.includes(catName))
          .map(catName => ({ id: catName, name: catName, icon: '💰' }));

      const combined = [...visibleDefaults, ...customCategories];
      const uniqueCategories = Array.from(new Map(combined.map(cat => [cat.name, cat])).values());

      return uniqueCategories.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    };

    const getStringCategoriesForView = (categoryType: 'invoiceCategories', defaultCategories: readonly string[]): string[] => {
        let userIds: string[];
        if (state.activeView.type === 'user') {
            userIds = [state.activeView.id];
        } else {
            const group = state.groups.find(g => g.id === state.activeView.id);
            userIds = group ? group.userIds : [];
        }

        const customCategories: string[] = userIds.flatMap(id => state.userData[id]?.[categoryType] ?? []);
        return [...new Set([...defaultCategories, ...customCategories])].sort();
    };
  
  const getExpenseSubcategoriesForView = (): Record<string, string[]> => {
    let userIds: string[];
    if (state.activeView.type === 'user') {
        userIds = [state.activeView.id];
    } else {
        const group = state.groups.find(g => g.id === state.activeView.id);
        userIds = group ? group.userIds : [];
    }

    const combined: Record<string, string[]> = JSON.parse(JSON.stringify(DEFAULT_EXPENSE_SUBCATEGORIES));
    
    userIds.forEach(id => {
        const userSubcategories = state.userData[id]?.expenseSubcategories;
        if (userSubcategories) {
            for (const category in userSubcategories) {
                if (!combined[category]) {
                    combined[category] = [];
                }
                combined[category] = [...new Set([...combined[category], ...userSubcategories[category]])];
            }
        }
    });

    return combined;
  };

  const getInsuranceSubcategoriesForView = (): Record<string, string[]> => {
    let userIds: string[];
    if (state.activeView.type === 'user') {
        userIds = [state.activeView.id];
    } else {
        const group = state.groups.find(g => g.id === state.activeView.id);
        userIds = group ? group.userIds : [];
    }

    const combined: Record<string, string[]> = {};
    INSURANCE_POLICY_TYPES.forEach(type => combined[type] = []);
    
    userIds.forEach(id => {
        const userSubcategories = state.userData[id]?.insuranceSubcategories;
        if (userSubcategories) {
            for (const category in userSubcategories) {
                if (!combined[category]) {
                    combined[category] = [];
                }
                combined[category] = [...new Set([...combined[category], ...userSubcategories[category]])];
            }
        }
    });

    return combined;
    };


  const transactions = useMemo(() => getDataForView('transactions'), [state.activeView, state.userData, state.groups]);
  const credits = useMemo(() => getDataForView('credits'), [state.activeView, state.userData, state.groups]);
  const receipts = useMemo(() => getDataForView('receipts'), [state.activeView, state.userData, state.groups]);
  const insurancePolicies = useMemo(() => getDataForView('insurancePolicies'), [state.activeView, state.userData, state.groups]);
  const goals = useMemo(() => getDataForView('goals'), [state.activeView, state.userData, state.groups]);
  const budgets = useMemo(() => getDataForView('budgets'), [state.activeView, state.userData, state.groups]);
  const savedTaxReturns = useMemo(() => getDataForView('savedTaxReturns'), [state.activeView, state.userData, state.groups]);
  const propertyInvestments = useMemo(() => getDataForView('propertyInvestments'), [state.activeView, state.userData, state.groups]);
  const manualAssets = useMemo(() => getDataForView('manualAssets'), [state.activeView, state.userData, state.groups]);
  const financialSimulations = useMemo(() => getDataForView('financialSimulations'), [state.activeView, state.userData, state.groups]);
  const investmentTransactions = useMemo(() => getDataForView('investmentTransactions'), [state.activeView, state.userData, state.groups]);
  const achievements = useMemo(() => getDataForView('achievements'), [state.activeView, state.userData, state.groups]);
  const savedInsights = useMemo(() => getDataForView('savedInsights'), [state.activeView, state.userData, state.groups]);
  
  const incomeCategories = useMemo(() => getObjectCategoriesForView('incomeCategories', DEFAULT_INCOME_CATEGORIES), [state.activeView, state.userData, state.groups]);
  const expenseCategories = useMemo(() => getObjectCategoriesForView('expenseCategories', DEFAULT_EXPENSE_CATEGORIES), [state.activeView, state.userData, state.groups]);
  const invoiceCategories = useMemo(() => getStringCategoriesForView('invoiceCategories', DEFAULT_INVOICE_CATEGORIES), [state.activeView, state.userData, state.groups]);
  const expenseSubcategories = useMemo(() => getExpenseSubcategoriesForView(), [state.activeView, state.userData, state.groups]);
  const insuranceSubcategories = useMemo(() => getInsuranceSubcategoriesForView(), [state.activeView, state.userData, state.groups]);

  const dashboardShortcuts = useMemo(() => {
    if (state.activeView.type === 'user') {
        const userData = state.userData[state.activeView.id];
        if (userData && Array.isArray(userData.dashboardShortcuts)) {
            return userData.dashboardShortcuts;
        }
        return DEFAULT_SHORTCUTS;
    }
    // Groups always see the default layout for simplicity
    return DEFAULT_SHORTCUTS;
  }, [state.activeView, state.userData]);

  const dashboardWidgets = useMemo(() => {
    const ALL_WIDGET_VALUES = new Set(Object.values(WidgetType));
    if (state.activeView.type === 'user') {
        const userData = state.userData[state.activeView.id];
        // Check if userData exists and dashboardWidgets is a valid array
        if (userData && Array.isArray(userData.dashboardWidgets)) {
            // Filter out any invalid widget types that might exist in old/imported data
            return userData.dashboardWidgets.filter(widget => ALL_WIDGET_VALUES.has(widget));
        }
        // Fallback to default if userData is missing, or dashboardWidgets is missing or not an array.
        return DEFAULT_WIDGETS;
    }
    return DEFAULT_WIDGETS;
  }, [state.activeView, state.userData]);

  const bottomNavShortcuts = useMemo(() => {
    if (state.activeView.type === 'user') {
        const userData = state.userData[state.activeView.id];
        if (userData && Array.isArray(userData.bottomNavShortcuts) && userData.bottomNavShortcuts.length > 0) {
            return userData.bottomNavShortcuts;
        }
        return DEFAULT_BOTTOM_NAV_SHORTCUTS;
    }
    return DEFAULT_BOTTOM_NAV_SHORTCUTS;
  }, [state.activeView, state.userData]);


  const educationProgress = useMemo(() => {
    if (state.activeView.type === 'user') {
        const userData = state.userData[state.activeView.id];
        return userData?.educationProgress ?? initialUserData.educationProgress!;
    }
    // Return default for groups as it's a personal journey
    return initialUserData.educationProgress!;
  }, [state.activeView, state.userData]);

  const alerts = useMemo(() => {
    const generatedAlerts: Alert[] = [];
    
    receipts.forEach(receipt => {
        if (receipt.cancellationReminder && receipt.cancellationNoticeMonths && receipt.autoRenews) {
            const dueDate = new Date(receipt.date);
            const reminderDate = new Date(dueDate);
            reminderDate.setMonth(dueDate.getMonth() - receipt.cancellationNoticeMonths);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (today >= reminderDate && today < dueDate) {
                generatedAlerts.push({
                    id: `alert-receipt-${receipt.id}`,
                    type: 'cancellation_reminder',
                    message: `Recordatorio para cancelar tu recibo '${receipt.title}'.`,
                    date: receipt.date,
                    sourceId: receipt.id,
                    title: receipt.title,
                });
            }
        }
    });

    insurancePolicies.forEach(policy => {
        if (policy.cancellationReminder && policy.cancellationNoticeMonths) {
            const renewalDate = new Date(policy.renewalDate);
            const reminderDate = new Date(renewalDate);
            reminderDate.setMonth(renewalDate.getMonth() - policy.cancellationNoticeMonths);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (today >= reminderDate && today < renewalDate) {
                generatedAlerts.push({
                    id: `alert-insurance-${policy.id}`,
                    type: 'insurance_reminder',
                    message: `Tu seguro '${policy.name}' está próximo a renovarse.`,
                    date: policy.renewalDate,
                    sourceId: policy.id,
                    title: policy.name,
                });
            }
        }
    });

    return generatedAlerts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [receipts, insurancePolicies]);


  const modifyUserData = (userId: string, updater: (currentUserData: UserData) => UserData) => {
    setState(prev => {
        let currentData = prev.userData[userId];
        if (!currentData) {
            currentData = JSON.parse(JSON.stringify(initialUserData));
        } else {
            currentData = { ...initialUserData, ...currentData };
        }
        
        // Ensure new users get default shortcuts and education progress if they don't have them
        if(!currentData.dashboardShortcuts) {
            currentData.dashboardShortcuts = DEFAULT_SHORTCUTS;
        }
         if(!currentData.dashboardWidgets) {
            currentData.dashboardWidgets = DEFAULT_WIDGETS;
        }
        if(!currentData.bottomNavShortcuts) {
            currentData.bottomNavShortcuts = DEFAULT_BOTTOM_NAV_SHORTCUTS;
        }
        if(!currentData.educationProgress) {
            currentData.educationProgress = initialUserData.educationProgress;
        }

        return {
          ...prev,
          userData: {
            ...prev.userData,
            [userId]: updater(currentData)
          }
        }
    });
  };
  
  const findOwnerId = (arrayKey: UserDataArrayKey, itemId: string): string | null => {
      for (const userId in state.userData) {
          const items = state.userData[userId][arrayKey];
          if (items && Array.isArray(items) && items.some(item => (item as {id:string}).id === itemId)) {
              return userId;
          }
      }
      return null;
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    modifyUserData(targetUserId, d => ({ ...d, transactions: [...d.transactions, { ...transaction, id: crypto.randomUUID() }] }));
  };
  
  const updateTransaction = (transaction: Transaction) => {
      const ownerId = transaction.ownerId || findOwnerId('transactions', transaction.id);
      if (!ownerId) return;
      modifyUserData(ownerId, d => ({
          ...d,
          transactions: d.transactions.map(t => t.id === transaction.id ? transaction : t),
      }));
  };
  
  const deleteTransaction = (transactionId: string) => {
      const ownerId = findOwnerId('transactions', transactionId);
      if (!ownerId) return;
      modifyUserData(ownerId, d => ({
          ...d,
          transactions: d.transactions.filter(t => t.id !== transactionId),
      }));
  };

  const addCredit = (credit: Omit<Credit, 'id'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    const newCreditId = crypto.randomUUID();
    const newCredit = { ...credit, id: newCreditId };

    const linkedTransaction: Omit<Transaction, 'id'> = {
        type: TransactionType.EXPENSE,
        category: 'Créditos',
        subcategory: credit.subcategory,
        amount: credit.monthlyPayment,
        date: credit.startDate,
        description: credit.name,
        frequency: 'monthly',
        creditId: newCreditId,
        notes: credit.notes,
    };
    
    modifyUserData(targetUserId, d => {
        const newTransactions = [...d.transactions, { ...linkedTransaction, id: crypto.randomUUID() }];
        return {
            ...d,
            credits: [...d.credits, newCredit],
            transactions: newTransactions
        }
    });
  };

  const updateCredit = (credit: Credit) => {
      const ownerId = credit.ownerId || findOwnerId('credits', credit.id);
      if (!ownerId) return;

      modifyUserData(ownerId, d => {
          const newCredits = d.credits.map(c => c.id === credit.id ? credit : c);
          const newTransactions = d.transactions.map(t => {
              if (t.creditId === credit.id) {
                  return {
                      ...t,
                      amount: credit.monthlyPayment,
                      description: credit.name,
                      category: 'Créditos',
                      subcategory: credit.subcategory,
                      notes: credit.notes,
                  };
              }
              return t;
          });
          return { ...d, credits: newCredits, transactions: newTransactions };
      });
  };

  const deleteCredit = (creditId: string) => {
      const ownerId = findOwnerId('credits', creditId);
      if (!ownerId) return;
      modifyUserData(ownerId, d => {
          const newCredits = d.credits.filter(c => c.id !== creditId);
          const newTransactions = d.transactions.filter(t => t.creditId !== creditId);
          return { ...d, credits: newCredits, transactions: newTransactions };
      });
  };

  const addReceipt = async (receipt: Omit<Receipt, 'id'> & { contractFileData?: string }, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    const newId = crypto.randomUUID();
    let newReceipt: Omit<Receipt, 'id'> = { ...receipt };
    delete (newReceipt as any).contractFileData;

    if (receipt.contractFileData && receipt.contractFile) {
        const fileId = `receipt-${newId}`;
        await saveFile(fileId, receipt.contractFileData);
        newReceipt.contractFileId = fileId;
    }

    modifyUserData(targetUserId, d => ({ ...d, receipts: [...d.receipts, { ...newReceipt, id: newId }] }));
  }
  
  const updateReceipt = async (receipt: Receipt, newContractFileData?: string) => {
    const ownerId = receipt.ownerId || findOwnerId('receipts', receipt.id);
    if (!ownerId) return;

    let updatedReceipt = { ...receipt };
    const originalReceipt = state.userData[ownerId].receipts.find(r => r.id === receipt.id);
    const hasNewFile = !!newContractFileData;
    const hadOldFile = !!originalReceipt?.contractFileId;
    const shouldHaveFile = !!receipt.contractFile;

    if (hasNewFile) {
        if (hadOldFile) {
            await deleteFile(originalReceipt.contractFileId!);
        }
        const fileId = `receipt-${receipt.id}`;
        await saveFile(fileId, newContractFileData);
        updatedReceipt.contractFileId = fileId;
    } else if (hadOldFile && !shouldHaveFile) {
        await deleteFile(originalReceipt.contractFileId!);
        delete updatedReceipt.contractFileId;
    }

    modifyUserData(ownerId, d => ({...d, receipts: d.receipts.map(r => r.id === receipt.id ? updatedReceipt : r)}));
  };

  const deleteReceipt = async (receiptId: string) => {
      const ownerId = findOwnerId('receipts', receiptId);
      if (!ownerId) return;

      const receiptToDelete = state.userData[ownerId].receipts.find(r => r.id === receiptId);
      if (receiptToDelete?.contractFileId) {
          await deleteFile(receiptToDelete.contractFileId).catch(err => console.error("Failed to delete file from IndexedDB", err));
      }

      modifyUserData(ownerId, d => ({...d, receipts: d.receipts.filter(r => r.id !== receiptId)}));
  };

  const addInsurancePolicy = async (policy: Omit<InsurancePolicy, 'id'> & { contractFileData?: string }, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    const newPolicyId = crypto.randomUUID();

    let newPolicyData: Omit<InsurancePolicy, 'id'> = { ...policy };
    delete (newPolicyData as any).contractFileData;

    if (policy.contractFileData && policy.contractFile) {
        const fileId = `policy-${newPolicyId}`;
        await saveFile(fileId, policy.contractFileData);
        newPolicyData.contractFileId = fileId;
    }

    const newPolicy = { ...newPolicyData, id: newPolicyId };

    const linkedTransaction: Omit<Transaction, 'id'> = {
        type: TransactionType.EXPENSE,
        category: 'Seguros',
        subcategory: policy.policyType,
        amount: policy.premium,
        date: policy.renewalDate,
        description: policy.name,
        frequency: policy.paymentFrequency,
        insuranceId: newPolicyId,
        notes: policy.notes,
        prorateOverMonths: policy.prorateOverMonths,
    };
    
    modifyUserData(targetUserId, d => {
        const newTransactions = [...d.transactions, { ...linkedTransaction, id: crypto.randomUUID() }];
        return {
            ...d,
            insurancePolicies: [...d.insurancePolicies, newPolicy],
            transactions: newTransactions
        }
    });
  };
  
  const updateInsurancePolicy = async (policy: InsurancePolicy, newContractFileData?: string) => {
      const ownerId = policy.ownerId || findOwnerId('insurancePolicies', policy.id);
      if (!ownerId) return;

      let updatedPolicy = { ...policy };
      const originalPolicy = state.userData[ownerId].insurancePolicies.find(p => p.id === policy.id);
      const hasNewFile = !!newContractFileData;
      const hadOldFile = !!originalPolicy?.contractFileId;
      const shouldHaveFile = !!policy.contractFile;

      if (hasNewFile) {
          if (hadOldFile) {
              await deleteFile(originalPolicy.contractFileId!);
          }
          const fileId = `policy-${policy.id}`;
          await saveFile(fileId, newContractFileData);
          updatedPolicy.contractFileId = fileId;
      } else if (hadOldFile && !shouldHaveFile) {
          await deleteFile(originalPolicy.contractFileId!);
          delete updatedPolicy.contractFileId;
      }
      
      modifyUserData(ownerId, d => {
          const newPolicies = d.insurancePolicies.map(p => p.id === policy.id ? updatedPolicy : p);
          const newTransactions = d.transactions.map(t => {
              if (t.insuranceId === policy.id) {
                  return {
                      ...t,
                      amount: policy.premium,
                      description: policy.name,
                      subcategory: policy.policyType,
                      frequency: policy.paymentFrequency,
                      notes: policy.notes,
                      prorateOverMonths: policy.prorateOverMonths,
                  };
              }
              return t;
          });
          return { ...d, insurancePolicies: newPolicies, transactions: newTransactions };
      });
  };

  const deleteInsurancePolicy = async (policyId: string) => {
      const ownerId = findOwnerId('insurancePolicies', policyId);
      if (!ownerId) return;

      const policyToDelete = state.userData[ownerId].insurancePolicies.find(p => p.id === policyId);
      if (policyToDelete?.contractFileId) {
          await deleteFile(policyToDelete.contractFileId).catch(err => console.error("Failed to delete file from IndexedDB", err));
      }

      modifyUserData(ownerId, d => {
          const newPolicies = d.insurancePolicies.filter(p => p.id !== policyId);
          const newTransactions = d.transactions.filter(t => t.insuranceId !== policyId);
          return { ...d, insurancePolicies: newPolicies, transactions: newTransactions };
      });
  };

  const addGoal = (goal: Omit<Goal, 'id' | 'contributionHistory'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    const newId = crypto.randomUUID();
    const contributionHistory: GoalContribution[] = [];

    if (goal.currentAmount > 0) {
        const initialContribution: GoalContribution = {
            id: crypto.randomUUID(),
            date: new Date(goal.startDate).toISOString(),
            amount: goal.currentAmount,
            description: 'Aportación inicial'
        };
        contributionHistory.push(initialContribution);
        
        if (goal.createTransactions) {
            const initialTransaction: Omit<Transaction, 'id'> = {
                type: TransactionType.SAVING,
                category: 'Ahorro',
                amount: goal.currentAmount,
                date: goal.startDate,
                description: `Aportación inicial a: ${goal.name}`,
                goalId: newId,
                goalContributionId: initialContribution.id
            };
            addTransaction(initialTransaction, targetUserId);
        }
    }
    
    modifyUserData(targetUserId, d => ({...d, goals: [...d.goals, { ...goal, id: newId, contributionHistory }]}));
  };

  const updateGoal = (goal: Goal) => {
    const ownerId = goal.ownerId || findOwnerId('goals', goal.id);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, goals: d.goals.map(g => g.id === goal.id ? goal : g)}));
  };

  const deleteGoal = (goalId: string) => {
    const ownerId = findOwnerId('goals', goalId);
    if (!ownerId) return;
    modifyUserData(ownerId, d => {
        // We keep the saving transactions but unlink them from the goal
        const newTransactions = d.transactions.map(t => {
            if (t.goalId === goalId) {
                const { goalId, goalContributionId, ...rest } = t;
                return { ...rest, description: `(Meta eliminada) ${t.description}` };
            }
            return t;
        });

        return {
            ...d,
            goals: d.goals.filter(g => g.id !== goalId),
            transactions: newTransactions
        };
    });
  };
  
  const addFundsToGoal = (goalId: string, amount: number, description?: string) => {
      const ownerId = findOwnerId('goals', goalId);
      if (!ownerId) return;
      
      const goal = state.userData[ownerId]?.goals.find(g => g.id === goalId);
      if (!goal) return;

      const newContribution: GoalContribution = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          amount,
          description
      };

      if (goal.createTransactions) {
        const newTransaction: Omit<Transaction, 'id'> = {
            type: TransactionType.SAVING,
            category: 'Ahorro',
            amount,
            date: new Date().toISOString().split('T')[0],
            description: `Aportación a: ${goal.name}`,
            goalId,
            goalContributionId: newContribution.id
        };
        addTransaction(newTransaction, ownerId);
      }

      modifyUserData(ownerId, d => {
          const newGoals = d.goals.map(g => {
              if (g.id === goalId) {
                  return {
                      ...g,
                      currentAmount: g.currentAmount + amount,
                      contributionHistory: [...(g.contributionHistory || []), newContribution]
                  };
              }
              return g;
          });
          return { ...d, goals: newGoals };
      });
  };

  const updateGoalContribution = (goalId: string, contribution: GoalContribution) => {
    const ownerId = findOwnerId('goals', goalId);
    if (!ownerId) return;

    modifyUserData(ownerId, d => {
        const newGoals = d.goals.map(g => {
            if (g.id === goalId) {
                // Update the specific contribution in the history
                const newHistory = g.contributionHistory.map(c => c.id === contribution.id ? contribution : c);
                
                // Recalculate the current amount from scratch based on non-excluded contributions
                const newCurrentAmount = newHistory
                    .filter(c => !c.isExcluded)
                    .reduce((sum, c) => sum + c.amount, 0);

                return {
                    ...g,
                    currentAmount: newCurrentAmount,
                    contributionHistory: newHistory,
                };
            }
            return g;
        });

        // Also update the associated transaction's `isExcluded` status
        const newTransactions = d.transactions.map(t => {
            if (t.goalContributionId === contribution.id) {
                return {
                    ...t,
                    amount: contribution.amount,
                    date: new Date(contribution.date).toISOString().split('T')[0],
                    description: t.description,
                    isExcluded: contribution.isExcluded,
                };
            }
            return t;
        });

        return { ...d, goals: newGoals, transactions: newTransactions };
    });
  };
  
  const deleteGoalContribution = (goalId: string, contributionId: string) => {
    const ownerId = findOwnerId('goals', goalId);
    if (!ownerId) return;

    let amountToRemove = 0;

    modifyUserData(ownerId, d => {
        const newGoals = d.goals.map(g => {
            if (g.id === goalId) {
                const contributionToRemove = g.contributionHistory.find(c => c.id === contributionId);
                amountToRemove = contributionToRemove ? contributionToRemove.amount : 0;
                const newHistory = g.contributionHistory.filter(c => c.id !== contributionId);
                return {
                    ...g,
                    currentAmount: g.currentAmount - amountToRemove,
                    contributionHistory: newHistory
                };
            }
            return g;
        });
        
        const newTransactions = d.transactions.filter(t => t.goalContributionId !== contributionId);
        return { ...d, goals: newGoals, transactions: newTransactions };
    });
  };

  const addBudget = (budget: Omit<Budget, 'id' | 'contributionHistory'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    const newId = crypto.randomUUID();
    const contributionHistory: BudgetContribution[] = [];

    if (budget.type === 'saving-fund' && budget.currentAmount > 0) {
        const initialContribution: BudgetContribution = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: budget.currentAmount,
            description: 'Aportación inicial'
        };
        contributionHistory.push(initialContribution);
        
        if (budget.createTransactions) {
            const initialTransaction: Omit<Transaction, 'id'> = {
                type: TransactionType.SAVING,
                category: 'Ahorro a Fondo',
                amount: budget.currentAmount,
                date: new Date().toISOString().split('T')[0],
                description: `Aportación inicial a: ${budget.name}`,
                budgetId: newId,
                budgetContributionId: initialContribution.id
            };
            addTransaction(initialTransaction, targetUserId);
        }
    }
    
    modifyUserData(targetUserId, d => ({...d, budgets: [...d.budgets, { ...budget, id: newId, contributionHistory }]}));
  };

  const updateBudget = (budget: Budget) => {
    const ownerId = budget.ownerId || findOwnerId('budgets', budget.id);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, budgets: d.budgets.map(b => b.id === budget.id ? budget : b)}));
  };

  const deleteBudget = (budgetId: string) => {
    const ownerId = findOwnerId('budgets', budgetId);
    if (!ownerId) return;
    modifyUserData(ownerId, d => {
        const newTransactions = d.transactions.map(t => {
            if (t.budgetId === budgetId) {
                const { budgetId, budgetContributionId, ...rest } = t;
                return { ...rest, description: `(Presupuesto eliminado) ${t.description}` };
            }
            return t;
        });

        return {
            ...d,
            budgets: d.budgets.filter(b => b.id !== budgetId),
            transactions: newTransactions
        };
    });
  };

  const addFundsToBudget = (budgetId: string, amount: number, description: string | undefined) => {
      const ownerId = findOwnerId('budgets', budgetId);
      if (!ownerId) return;

      const budget = state.userData[ownerId]?.budgets.find(b => b.id === budgetId);
      if (!budget) return;

      const newContribution: BudgetContribution = {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          amount,
          description
      };
      
      if (budget.createTransactions) {
          const newTransaction: Omit<Transaction, 'id'> = {
              type: TransactionType.SAVING,
              category: 'Ahorro a Fondo',
              amount,
              date: new Date().toISOString().split('T')[0],
              description: `Aportación a: ${budget.name}`,
              budgetId,
              budgetContributionId: newContribution.id
          };
          addTransaction(newTransaction, ownerId);
      }

      modifyUserData(ownerId, d => {
          const newBudgets = d.budgets.map(b => {
              if (b.id === budgetId) {
                  return {
                      ...b,
                      currentAmount: b.currentAmount + amount,
                      contributionHistory: [...(b.contributionHistory || []), newContribution]
                  };
              }
              return b;
          });
          return { ...d, budgets: newBudgets };
      });
  };

  const updateBudgetContribution = (budgetId: string, contribution: BudgetContribution) => {
    const ownerId = findOwnerId('budgets', budgetId);
    if (!ownerId) return;

    modifyUserData(ownerId, d => {
        const newBudgets = d.budgets.map(b => {
            if (b.id === budgetId) {
                // Update the specific contribution in the history
                const newHistory = b.contributionHistory.map(c => c.id === contribution.id ? contribution : c);
                
                // Recalculate the current amount from scratch based on non-excluded contributions
                const newCurrentAmount = newHistory
                    .filter(c => !c.isExcluded)
                    .reduce((sum, c) => sum + c.amount, 0);

                return {
                    ...b,
                    currentAmount: newCurrentAmount,
                    contributionHistory: newHistory,
                };
            }
            return b;
        });

        // Also update the associated transaction's `isExcluded` status
        const newTransactions = d.transactions.map(t => {
            if (t.budgetContributionId === contribution.id) {
                return {
                    ...t,
                    amount: contribution.amount,
                    date: new Date(contribution.date).toISOString().split('T')[0],
                    description: t.description,
                    isExcluded: contribution.isExcluded,
                };
            }
            return t;
        });

        return { ...d, budgets: newBudgets, transactions: newTransactions };
    });
  };
  
  const deleteBudgetContribution = (budgetId: string, contributionId: string) => {
    const ownerId = findOwnerId('budgets', budgetId);
    if (!ownerId) return;
    let amountToRemove = 0;
    modifyUserData(ownerId, d => {
        const newBudgets = d.budgets.map(b => {
            if (b.id === budgetId) {
                const contributionToRemove = b.contributionHistory.find(c => c.id === contributionId);
                amountToRemove = contributionToRemove ? contributionToRemove.amount : 0;
                const newHistory = b.contributionHistory.filter(c => c.id !== contributionId);
                return { ...b, currentAmount: b.currentAmount - amountToRemove, contributionHistory: newHistory };
            }
            return b;
        });
        const newTransactions = d.transactions.filter(t => t.budgetContributionId !== contributionId);
        return { ...d, budgets: newBudgets, transactions: newTransactions };
    });
  };

  const addPropertyInvestment = (investment: Omit<PropertyInvestment, 'id'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    modifyUserData(targetUserId, d => ({...d, propertyInvestments: [...(d.propertyInvestments || []), { ...investment, id: crypto.randomUUID() }]}));
  };

  const updatePropertyInvestment = (investment: PropertyInvestment) => {
    const ownerId = investment.ownerId || findOwnerId('propertyInvestments', investment.id);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, propertyInvestments: d.propertyInvestments?.map(p => p.id === investment.id ? investment : p)}));
  };

  const deletePropertyInvestment = (investmentId: string) => {
    const ownerId = findOwnerId('propertyInvestments', investmentId);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, propertyInvestments: d.propertyInvestments?.filter(p => p.id !== investmentId)}));
  };

  const addManualAsset = (asset: Omit<ManualAsset, 'id'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    modifyUserData(targetUserId, d => ({...d, manualAssets: [...(d.manualAssets || []), { ...asset, id: crypto.randomUUID() }]}));
  };

  const updateManualAsset = (asset: ManualAsset) => {
    const ownerId = asset.ownerId || findOwnerId('manualAssets', asset.id);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, manualAssets: d.manualAssets?.map(a => a.id === asset.id ? asset : a)}));
  };

  const deleteManualAsset = (assetId: string) => {
    const ownerId = findOwnerId('manualAssets', assetId);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, manualAssets: d.manualAssets?.filter(a => a.id !== assetId)}));
  };
  
  const addFinancialSimulation = (simulation: Omit<FinancialSimulation, 'id'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    modifyUserData(targetUserId, d => ({...d, financialSimulations: [...(d.financialSimulations || []), { ...simulation, id: crypto.randomUUID() }]}));
  };

  const updateFinancialSimulation = (simulation: FinancialSimulation) => {
    const ownerId = simulation.ownerId || findOwnerId('financialSimulations', simulation.id);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, financialSimulations: d.financialSimulations?.map(s => s.id === simulation.id ? simulation : s)}));
  };

  const deleteFinancialSimulation = (simulationId: string) => {
    const ownerId = findOwnerId('financialSimulations', simulationId);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, financialSimulations: d.financialSimulations?.filter(s => s.id !== simulationId)}));
  };

  const addInvestmentTransaction = (investment: Omit<InvestmentTransaction, 'id'>, ownerId?: string) => {
    const targetUserId = ownerId || activeUserForModification.id;
    modifyUserData(targetUserId, d => ({...d, investmentTransactions: [...(d.investmentTransactions || []), { ...investment, id: crypto.randomUUID() }]}));
  };

  const updateInvestmentTransaction = (investment: InvestmentTransaction) => {
    const ownerId = investment.ownerId || findOwnerId('investmentTransactions', investment.id);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, investmentTransactions: d.investmentTransactions?.map(i => i.id === investment.id ? investment : i)}));
  };

  const deleteInvestmentTransaction = (investmentId: string) => {
    const ownerId = findOwnerId('investmentTransactions', investmentId);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, investmentTransactions: d.investmentTransactions?.filter(i => i.id !== investmentId)}));
  };

  const updateDashboardShortcuts = (shortcuts: string[]) => {
    if (state.activeView.type === 'user') {
      modifyUserData(state.activeView.id, d => ({...d, dashboardShortcuts: shortcuts}));
    }
  };
  
  const updateDashboardWidgets = (widgets: WidgetType[]) => {
    if (state.activeView.type === 'user') {
        modifyUserData(state.activeView.id, d => ({...d, dashboardWidgets: widgets}));
    }
  };
  
  const updateBottomNavShortcuts = (shortcuts: string[]) => {
    if (state.activeView.type === 'user') {
        modifyUserData(state.activeView.id, d => ({...d, bottomNavShortcuts: shortcuts}));
    }
  };

  const updateCreditToxicity = (creditId: string, report: ToxicityReport) => {
    const ownerId = findOwnerId('credits', creditId);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, credits: d.credits.map(c => c.id === creditId ? { ...c, toxicityReport: report } : c)}));
  };
  
  const deleteCreditToxicity = (creditId: string) => {
    const ownerId = findOwnerId('credits', creditId);
    if (!ownerId) return;
    modifyUserData(ownerId, d => ({...d, credits: d.credits.map(c => {
        if(c.id === creditId) {
            const { toxicityReport, ...rest } = c;
            return rest;
        }
        return c;
    })}));
  };

  const addUser = (name: string) => {
    const newUserId = crypto.randomUUID();
    const newUser: User = { 
        id: newUserId, 
        name,
        color: PROFILE_COLORS[state.users.length % PROFILE_COLORS.length]
    };
    setState(prev => {
        const newState = { ...prev, users: [...prev.users, newUser] };
        newState.userData[newUserId] = JSON.parse(JSON.stringify(initialUserData));
        return newState;
    });
  };

  const updateUser = (userId: string, updates: Partial<Omit<User, 'id'>>) => {
      setState(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === userId ? { ...u, ...updates } : u)
      }));
  };
  
  const switchView = (view: ActiveView) => setState(prev => ({ ...prev, activeView: view }));

  const addGroup = (name: string, userIds: string[]) => {
    const newGroup: Group = { id: crypto.randomUUID(), name, userIds };
    setState(prev => ({ ...prev, groups: [...prev.groups, newGroup] }));
  };
  
  const updateGroup = (groupId: string, name: string, userIds: string[]) => {
    setState(prev => ({...prev, groups: prev.groups.map(g => g.id === groupId ? { ...g, name, userIds } : g)}));
  };
  
  const deleteGroup = (groupId: string) => {
    setState(prev => {
        const newGroups = prev.groups.filter(g => g.id !== groupId);
        let newActiveView = prev.activeView;
        if(prev.activeView.type === 'group' && prev.activeView.id === groupId) {
            newActiveView = { type: 'user', id: prev.users[0].id };
        }
        return { ...prev, groups: newGroups, activeView: newActiveView };
    });
  };
  
  // --- Category Management ---
    const addIncomeCategory = (category: Omit<Category, 'id'>) => {
        const targetUserId = activeUserForModification.id;
        const newCategory = { ...category, id: crypto.randomUUID() };
        modifyUserData(targetUserId, d => ({...d, incomeCategories: [...(d.incomeCategories || []), newCategory]}));
    };
    
    const addExpenseCategory = (category: Omit<Category, 'id'>) => {
        const targetUserId = activeUserForModification.id;
        const newCategory = { ...category, id: crypto.randomUUID() };
        modifyUserData(targetUserId, d => ({...d, expenseCategories: [...(d.expenseCategories || []), newCategory]}));
    };

    const updateIncomeCategory = (categoryId: string, updates: Partial<Omit<Category, 'id'>>) => {
        const ownerId = findOwnerId('incomeCategories', categoryId);
    
        if (ownerId) { // It's a custom category, update it.
            modifyUserData(ownerId, d => {
                let oldCategoryName: string | undefined;
                const newCategories = d.incomeCategories?.map(c => {
                    if (c.id === categoryId) {
                        oldCategoryName = c.name;
                        return { ...c, ...updates };
                    }
                    return c;
                }) || [];
                
                let newTransactions = d.transactions;
                if (oldCategoryName && updates.name && oldCategoryName !== updates.name) {
                    newTransactions = d.transactions.map(t => {
                        if (t.type === TransactionType.INCOME && t.category === oldCategoryName) {
                            return { ...t, category: updates.name! };
                        }
                        return t;
                    });
                }
    
                return { ...d, incomeCategories: newCategories, transactions: newTransactions };
            });
        } 
        else if (DEFAULT_INCOME_CATEGORIES.includes(categoryId)) { // It's a default category
            const oldCategoryName = categoryId;
            const newCategoryName = updates.name;
            const targetUserId = activeUserForModification.id;
            const finalNewName = newCategoryName || oldCategoryName;
            
            modifyUserData(targetUserId, d => {
                let newTransactions = d.transactions;

                if (finalNewName && oldCategoryName !== finalNewName) {
                    newTransactions = d.transactions.map(t => {
                        if (t.type === TransactionType.INCOME && t.category === oldCategoryName) {
                            return { ...t, category: finalNewName };
                        }
                        return t;
                    });
                }

                const newHidden = [...(d.hiddenDefaultIncomeCategories || [])];
                if (!newHidden.includes(oldCategoryName)) {
                    newHidden.push(oldCategoryName);
                }

                const newCustomCategory = { name: finalNewName, icon: updates.icon || '💰', id: crypto.randomUUID() };
                const newCustomCategories = [...(d.incomeCategories || []), newCustomCategory];
                
                return {
                    ...d,
                    transactions: newTransactions,
                    hiddenDefaultIncomeCategories: newHidden,
                    incomeCategories: newCustomCategories,
                };
            });
        }
    };

    const deleteIncomeCategory = (categoryId: string) => {
        const ownerId = findOwnerId('incomeCategories', categoryId);
        if (!ownerId) return;

        modifyUserData(ownerId, d => {
            const categoryToDelete = d.incomeCategories?.find(c => c.id === categoryId);
            if (!categoryToDelete) return d;

            const newCategories = d.incomeCategories?.filter(c => c.id !== categoryId) || [];
            
            const newTransactions = d.transactions.map(t => {
                if (t.type === TransactionType.INCOME && t.category === categoryToDelete.name) {
                    return { ...t, category: 'Otros' }; // Reassign to a default category
                }
                return t;
            });

            return { ...d, incomeCategories: newCategories, transactions: newTransactions };
        });
    };

    const updateExpenseCategory = (categoryId: string, updates: Partial<Omit<Category, 'id'>>) => {
        const ownerId = findOwnerId('expenseCategories', categoryId);
    
        if (ownerId) { // It's a custom category, update it
            modifyUserData(ownerId, d => {
                let oldCategoryName: string | undefined;
                const newCategories = d.expenseCategories?.map(c => {
                    if (c.id === categoryId) {
                        oldCategoryName = c.name;
                        return { ...c, ...updates };
                    }
                    return c;
                }) || [];
                
                let newTransactions = d.transactions;
                let newBudgets = d.budgets;
                let newExpenseSubcategories = d.expenseSubcategories || {};
    
                if (oldCategoryName && updates.name && oldCategoryName !== updates.name) {
                    newTransactions = d.transactions.map(t => {
                        if (t.type === TransactionType.EXPENSE && t.category === oldCategoryName) {
                            return { ...t, category: updates.name! };
                        }
                        return t;
                    });
                    newBudgets = d.budgets.map(b => {
                        if (b.category === oldCategoryName) {
                            return { ...b, category: updates.name! };
                        }
                        return b;
                    });
                    if (newExpenseSubcategories[oldCategoryName]) {
                        newExpenseSubcategories[updates.name] = newExpenseSubcategories[oldCategoryName];
                        delete newExpenseSubcategories[oldCategoryName];
                    }
                }
    
                return { ...d, expenseCategories: newCategories, transactions: newTransactions, budgets: newBudgets, expenseSubcategories: newExpenseSubcategories };
            });
        } 
        else if (DEFAULT_EXPENSE_CATEGORIES.includes(categoryId)) { // It's a default category, handle renaming
            const oldCategoryName = categoryId;
            const newCategoryName = updates.name;
            const finalNewName = newCategoryName || oldCategoryName;

            if (finalNewName === oldCategoryName) return;

            let userIdsToUpdate: string[] = [];
            if (state.activeView.type === 'user') {
                userIdsToUpdate = [state.activeView.id];
            } else {
                const group = state.groups.find(g => g.id === state.activeView.id);
                if (group) userIdsToUpdate = group.userIds;
            }

            setState(prev => {
                const newState = { ...prev };
                const newUserData = { ...newState.userData };

                for (const userId of userIdsToUpdate) {
                    let d = newUserData[userId];
                    if (!d) continue;

                    let newTransactions = d.transactions.map(t =>
                        (t.type === TransactionType.EXPENSE && t.category === oldCategoryName)
                            ? { ...t, category: finalNewName }
                            : t
                    );

                    let newBudgets = d.budgets.map(b =>
                        (b.category === oldCategoryName)
                            ? { ...b, category: finalNewName }
                            : b
                    );
                    
                    let newExpenseSubcategories = { ...(d.expenseSubcategories || {}) };
                    if (newExpenseSubcategories[oldCategoryName]) {
                        newExpenseSubcategories[finalNewName] = newExpenseSubcategories[oldCategoryName];
                        delete newExpenseSubcategories[oldCategoryName];
                    }

                    const newHidden = [...(d.hiddenDefaultExpenseCategories || [])];
                    if (!newHidden.includes(oldCategoryName)) {
                        newHidden.push(oldCategoryName);
                    }
                    
                    const newCustomCategory = { name: finalNewName, icon: updates.icon || '💰', id: crypto.randomUUID() };
                    const newCustomCategories = [...(d.expenseCategories || []), newCustomCategory];

                    newUserData[userId] = {
                        ...d,
                        transactions: newTransactions,
                        budgets: newBudgets,
                        expenseSubcategories: newExpenseSubcategories,
                        hiddenDefaultExpenseCategories: newHidden,
                        expenseCategories: newCustomCategories,
                    };
                }
                
                return { ...newState, userData: newUserData };
            });
        }
    };

    const deleteExpenseCategory = (categoryId: string) => {
        const ownerId = findOwnerId('expenseCategories', categoryId);
        if (!ownerId) return;

        modifyUserData(ownerId, d => {
            const categoryToDelete = d.expenseCategories?.find(c => c.id === categoryId);
            if (!categoryToDelete) return d;

            const newCategories = d.expenseCategories?.filter(c => c.id !== categoryId) || [];
            
            const newTransactions = d.transactions.map(t => {
                if (t.type === TransactionType.EXPENSE && t.category === categoryToDelete.name) {
                    return { ...t, category: 'Otros', subcategory: undefined };
                }
                return t;
            });
            const newBudgets = d.budgets.filter(b => b.category !== categoryToDelete.name);
            const newSubcategories = d.expenseSubcategories || {};
            delete newSubcategories[categoryToDelete.name];

            return { ...d, expenseCategories: newCategories, transactions: newTransactions, budgets: newBudgets, expenseSubcategories: newSubcategories };
        });
    };
    
    const addExpenseSubcategory = (category: string, subcategory: string) => {
        const targetUserId = activeUserForModification.id;
        modifyUserData(targetUserId, d => {
            const newSubcategories = { ...(d.expenseSubcategories || {}) };
            if (!newSubcategories[category]) newSubcategories[category] = [];
            if (!newSubcategories[category].includes(subcategory)) {
                newSubcategories[category].push(subcategory);
            }
            return { ...d, expenseSubcategories: newSubcategories };
        });
    };

    const updateExpenseSubcategory = (category: string, oldName: string, newName: string) => {
        const ownerId = activeUserForModification.id; // Subcategories are user-specific
        modifyUserData(ownerId, d => {
            const newSubcategories = { ...(d.expenseSubcategories || {}) };
            if (newSubcategories[category]) {
                newSubcategories[category] = newSubcategories[category].map(s => s === oldName ? newName : s);
            }
            const newTransactions = d.transactions.map(t => {
                if (t.category === category && t.subcategory === oldName) {
                    return { ...t, subcategory: newName };
                }
                return t;
            });
            return { ...d, expenseSubcategories: newSubcategories, transactions: newTransactions };
        });
    };

    const deleteExpenseSubcategory = (category: string, subcategory: string) => {
        const ownerId = activeUserForModification.id;
        modifyUserData(ownerId, d => {
            const newSubcategories = { ...(d.expenseSubcategories || {}) };
            if (newSubcategories[category]) {
                newSubcategories[category] = newSubcategories[category].filter(s => s !== subcategory);
            }
             const newTransactions = d.transactions.map(t => {
                if (t.category === category && t.subcategory === subcategory) {
                    return { ...t, subcategory: undefined };
                }
                return t;
            });
            return { ...d, expenseSubcategories: newSubcategories, transactions: newTransactions };
        });
    };
    
    const addInvoiceCategory = (category: string, ownerId: string) => {
        modifyUserData(ownerId, d => {
            const newCategories = [...(d.invoiceCategories || [])];
            if (!newCategories.includes(category)) {
                newCategories.push(category);
            }
            return { ...d, invoiceCategories: newCategories };
        });
    };

    const addInsuranceSubcategory = (policyType: InsurancePolicyType, subcategory: string) => {
        const targetUserId = activeUserForModification.id;
        modifyUserData(targetUserId, d => {
            const newSubcategories = { ...(d.insuranceSubcategories || {}) };
            if (!newSubcategories[policyType]) newSubcategories[policyType] = [];
            if (!newSubcategories[policyType].includes(subcategory)) {
                newSubcategories[policyType].push(subcategory);
            }
            return { ...d, insuranceSubcategories: newSubcategories };
        });
    };
    
    const updateInsuranceSubcategory = (policyType: InsurancePolicyType, oldName: string, newName: string) => {
        const ownerId = activeUserForModification.id;
        modifyUserData(ownerId, d => {
            const newSubcategories = { ...(d.insuranceSubcategories || {}) };
            if (newSubcategories[policyType]) {
                newSubcategories[policyType] = newSubcategories[policyType].map(s => s === oldName ? newName : s);
            }
            const newPolicies = d.insurancePolicies.map(p => {
                if (p.policyType === policyType && p.subcategory === oldName) {
                    return { ...p, subcategory: newName };
                }
                return p;
            });
            return { ...d, insuranceSubcategories: newSubcategories, insurancePolicies: newPolicies };
        });
    };

    const deleteInsuranceSubcategory = (policyType: InsurancePolicyType, subcategory: string) => {
        const ownerId = activeUserForModification.id;
        modifyUserData(ownerId, d => {
            const newSubcategories = { ...(d.insuranceSubcategories || {}) };
            if (newSubcategories[policyType]) {
                newSubcategories[policyType] = newSubcategories[policyType].filter(s => s !== subcategory);
            }
             const newPolicies = d.insurancePolicies.map(p => {
                if (p.policyType === policyType && p.subcategory === subcategory) {
                    return { ...p, subcategory: undefined };
                }
                return p;
            });
            return { ...d, insuranceSubcategories: newSubcategories, insurancePolicies: newPolicies };
        });
    };
  
    // --- Taxation & Education ---
    const addSavedTaxReturn = (returnData: Omit<SavedTaxReturn, 'id' | 'dateSaved'>) => {
        const targetUserId = activeUserForModification.id;
        const newReturn: SavedTaxReturn = {
            ...returnData,
            id: crypto.randomUUID(),
            dateSaved: new Date().toISOString()
        };
        modifyUserData(targetUserId, d => ({...d, savedTaxReturns: [...(d.savedTaxReturns || []), newReturn]}));
    };
    
    const deleteSavedTaxReturn = (returnId: string) => {
        const ownerId = findOwnerId('savedTaxReturns', returnId);
        if (!ownerId) return;
        modifyUserData(ownerId, d => ({...d, savedTaxReturns: d.savedTaxReturns?.filter(r => r.id !== returnId)}));
    };
    
    const updateEducationProgress = (progress: Partial<EducationProgress>) => {
        if (state.activeView.type === 'user') {
            modifyUserData(state.activeView.id, d => ({...d, educationProgress: {...d.educationProgress!, ...progress}}));
        }
    };
    
    // --- Transaction Exclusion ---
    const excludedInstances = useMemo(() => {
        let combined: Record<string, boolean> = {};
        if (state.activeView.type === 'user') {
            combined = state.userData[state.activeView.id]?.excludedInstances ?? {};
        } else {
             const group = state.groups.find(g => g.id === state.activeView.id);
             if (group) {
                group.userIds.forEach(userId => {
                    Object.assign(combined, state.userData[userId]?.excludedInstances ?? {});
                });
             }
        }
        return combined;
    }, [state.activeView, state.userData, state.groups]);
    
    const toggleTransactionInstanceExclusion = (instanceId: string) => {
        if (state.activeView.type === 'user') {
            modifyUserData(state.activeView.id, d => {
                const newExcluded = { ...(d.excludedInstances || {}) };
                newExcluded[instanceId] = !newExcluded[instanceId];
                return { ...d, excludedInstances: newExcluded };
            });
        }
    };
    
    const getExpandedTransactionsForYear = (targetYear: number) => {
        const yearlyTransactions: (Transaction & { instanceId: string, isExcluded?: boolean })[] = [];
        
        transactions.forEach(t => {
            const transactionDate = new Date(t.date + 'T00:00:00Z'); // Ensure UTC context
            const transactionYear = transactionDate.getUTCFullYear();

            if (t.frequency) {
                let months: number[] = [];
                switch(t.frequency) {
                    case 'monthly': months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; break;
                    case 'quarterly': months = [0, 3, 6, 9]; break; // Assuming start of year quarters
                    case 'semiannually': months = [0, 6]; break;
                    case 'annually': months = [transactionDate.getUTCMonth()]; break;
                }
                
                months.forEach(month => {
                    const instanceDate = new Date(Date.UTC(targetYear, month, transactionDate.getUTCDate()));
                    if (instanceDate.getUTCFullYear() === targetYear) {
                         const instanceId = `${t.id}|${targetYear}-${month}`;
                         yearlyTransactions.push({
                            ...t,
                            date: instanceDate.toISOString().split('T')[0],
                            instanceId,
                            isExcluded: !!excludedInstances[instanceId]
                         });
                    }
                });
            } else if (transactionYear === targetYear) {
                const instanceId = `${t.id}|${t.date}`;
                yearlyTransactions.push({
                    ...t,
                    instanceId,
                    isExcluded: !!excludedInstances[instanceId]
                });
            }
        });

        return yearlyTransactions;
    };
  
    const grantAchievement = (achievementId: string) => {
        if (state.activeView.type === 'user') {
            modifyUserData(state.activeView.id, d => {
                const existing = d.achievements || [];
                if (existing.some(a => a.id === achievementId)) {
                    return d; // Already unlocked
                }
                const newAchievement: Achievement = {
                    id: achievementId,
                    unlockedDate: new Date().toISOString(),
                };
                return { ...d, achievements: [...existing, newAchievement] };
            });
        }
    };

    const addSavedInsight = (insight: Omit<SavedInsight, 'id'>) => {
        const targetUserId = activeUserForModification.id;
        const newInsight = { ...insight, id: crypto.randomUUID() };
        modifyUserData(targetUserId, d => ({ ...d, savedInsights: [...(d.savedInsights || []), newInsight] }));
    };

    const deleteSavedInsight = (insightId: string) => {
        const ownerId = findOwnerId('savedInsights', insightId);
        if (!ownerId) return;
        modifyUserData(ownerId, d => ({
            ...d,
            savedInsights: (d.savedInsights || []).filter(i => i.id !== insightId),
        }));
    };

  const value: AppContextType = {
    // State
    users: state.users,
    groups: state.groups,
    activeView: state.activeView,
    activeViewTarget,
    groupMembers,
    
    // Derived Data
    transactions,
    credits,
    receipts,
    insurancePolicies,
    goals,
    budgets,
    dashboardShortcuts,
    dashboardWidgets,
    bottomNavShortcuts,
    alerts,
    incomeCategories,
    expenseCategories,
    expenseSubcategories,
    invoiceCategories,
    insuranceSubcategories,
    savedTaxReturns,
    educationProgress,
    excludedInstances,
    propertyInvestments,
    manualAssets,
    financialSimulations,
    investmentTransactions,
    achievements,
    savedInsights,

    // Actions
    addTransaction, updateTransaction, deleteTransaction,
    addCredit, updateCredit, deleteCredit,
    addReceipt, updateReceipt, deleteReceipt,
    addInsurancePolicy, updateInsurancePolicy, deleteInsurancePolicy,
    addGoal, updateGoal, deleteGoal, addFundsToGoal, updateGoalContribution, deleteGoalContribution,
    addBudget, updateBudget, deleteBudget, addFundsToBudget, updateBudgetContribution, deleteBudgetContribution,
    addPropertyInvestment, updatePropertyInvestment, deletePropertyInvestment,
    addManualAsset, updateManualAsset, deleteManualAsset,
    addFinancialSimulation, updateFinancialSimulation, deleteFinancialSimulation,
    addInvestmentTransaction, updateInvestmentTransaction, deleteInvestmentTransaction,
    updateDashboardShortcuts, updateDashboardWidgets, updateBottomNavShortcuts,
    updateCreditToxicity, deleteCreditToxicity,
    addUser, updateUser, switchView, addGroup, updateGroup, deleteGroup,
    addIncomeCategory, updateIncomeCategory, deleteIncomeCategory,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    addExpenseSubcategory, updateExpenseSubcategory, deleteExpenseSubcategory,
    addInvoiceCategory, addInsuranceSubcategory, updateInsuranceSubcategory, deleteInsuranceSubcategory,
    addSavedTaxReturn, deleteSavedTaxReturn,
    updateEducationProgress,
    toggleTransactionInstanceExclusion, getExpandedTransactionsForYear,
    grantAchievement,
    addSavedInsight,
    deleteSavedInsight,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};