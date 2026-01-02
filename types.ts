
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  SAVING = 'saving',
}

export type CreditSubcategory = 'Financiación' | 'Tarjeta' | 'Hipoteca' | 'Préstamo';

export type InsurancePolicyType = 'Coche' | 'Hogar' | 'Vida' | 'Salud' | 'Otros';

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  subcategory?: string;
  amount: number;
  date: string;
  description: string;
  frequency?: ReceiptFrequency;
  creditId?: string;
  insuranceId?: string;
  goalId?: string;
  goalContributionId?: string;
  budgetId?: string;
  budgetContributionId?: string;
  notes?: string;
  prorateOverMonths?: number;
  isExcluded?: boolean;
  ownerId?: string;
}

export interface Credit {
  id: string;
  name: string;
  totalAmount: number;
  monthlyPayment: number;
  tin: number; // Tipo de Interés Nominal
  tae: number; // Tasa Anual Equivalente
  startDate: string;
  endDate: string;
  subcategory: CreditSubcategory;
  toxicityReport?: ToxicityReport;
  notes?: string;
  ownerId?: string;
}

export interface ToxicityReport {
  score: number;
  explanation: string;
}

export enum ReceiptType {
  RECEIPT = 'receipt', // For recurring payments like insurance, subscriptions
  INVOICE = 'invoice', // For one-time bills to be saved for taxes etc.
}

export type ReceiptFrequency = 'monthly' | 'quarterly' | 'semiannually' | 'annually';

export interface Receipt {
  id: string;
  type: ReceiptType;
  title: string;
  amount: number;
  date: string; // For INVOICE: issue date. For RECEIPT: next due date.
  description: string;
  contractFile?: string;
  contractFileId?: string;
  invoiceCategory?: string;
  isTaxDeductible?: boolean;

  // Fields for recurring receipts
  frequency?: ReceiptFrequency;
  autoRenews?: boolean;
  prorateOverMonths?: number; // For annual receipts to be budgeted monthly
  cancellationReminder?: boolean;
  cancellationNoticeMonths?: number;
  notes?: string;
  ownerId?: string;
}

export interface InsurancePolicy {
  id: string;
  name: string;
  policyType: InsurancePolicyType;
  subcategory?: string;
  premium: number;
  paymentFrequency: ReceiptFrequency;
  renewalDate: string;
  cancellationReminder: boolean;
  cancellationNoticeMonths?: number;
  contractFile?: string;
  contractFileId?: string;
  notes?: string;
  prorateOverMonths?: number;
  ownerId?: string;
}

export interface Alert {
    id: string;
    type: 'cancellation_reminder' | 'insurance_reminder' | 'budget_warning' | 'goal_warning';
    message: string;
    date: string; // due date of the receipt/policy
    sourceId: string; // receipt or insurance id
    title: string;
}

export interface GoalContribution {
  id: string;
  date: string;
  amount: number;
  description?: string;
  isExcluded?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate: string;
  deadline: string;
  notes?: string;
  contributionHistory: GoalContribution[];
  ownerId?: string;
  createTransactions?: boolean;
}

export interface BudgetContribution {
  id: string;
  date: string;
  amount: number;
  description?: string;
  isExcluded?: boolean;
}

export interface Budget {
    id: string;
    name: string;
    category?: string;
    targetAmount: number;
    currentAmount: number;
    type: 'spending-limit' | 'saving-fund';
    priority: 'essential' | 'secondary';
    deadline?: string;
    notes?: string;
    contributionHistory: BudgetContribution[];
    ownerId?: string;
    createTransactions?: boolean;
}


export interface User {
    id:string;
    name: string;
    color?: string;
}

export interface Group {
    id: string;
    name: string;
    userIds: string[];
}

export interface ScannedReceiptData {
    amount?: number;
    date?: string; // YYYY-MM-DD
    description?: string;
    category?: string;
    fileName?: string;
    fileData?: string;
}

export enum WidgetType {
    AI_SUMMARY = 'AI_SUMMARY',
    ALERTS = 'ALERTS',
    ANNUAL_PAYMENTS = 'ANNUAL_PAYMENTS',
    MONTHLY_SUMMARY = 'MONTHLY_SUMMARY',
    GOALS = 'GOALS',
    SAVINGS_SUMMARY = 'SAVINGS_SUMMARY',
    FINANCIAL_SUMMARY = 'FINANCIAL_SUMMARY',
    EXPENSE_DISTRIBUTION = 'EXPENSE_DISTRIBUTION',
    ACHIEVEMENTS = 'ACHIEVEMENTS',
    FIRE_TRACKER = 'FIRE_TRACKER',
}

export interface WidgetConfig {
    id: WidgetType;
}

export interface PropertyInvestment {
    id: string;
    name: string;
    purchasePrice: number;
    community: string;
    notaryFees: number;
    registryFees: number;
    reforms: number;
    agencyCommission: number;
    managementFees: number;
    appraisalFees: number;
    financingPercentage: number;
    interestRate: number;
    loanTermYears: number;
    monthlyRent: number;
    communityExpenses: number;
    maintenance: number;
    homeInsurance: number;
    mortgageLifeInsurance: number;
    nonPaymentInsurance: number;
    ibi: number;
    vacancyMonths: number;
    annualGrossSalary: number;
    aiVerdict?: string;
    ownerId?: string;
}

export interface ManualAsset {
    id: string;
    name: string;
    value: number;
    category: 'Real Estate' | 'Vehicle' | 'Valuables' | 'Cash' | 'Investment' | 'Other';
    notes?: string;
    ownerId?: string;
}

export type InvestmentType = 'Stock' | 'ETF' | 'Crypto' | 'Fund' | 'RealEstate' | 'Other';

export interface InvestmentTransaction {
    id: string;
    type: InvestmentType;
    name: string;
    purchaseDate: string;
    purchaseAmount: number; // Cost basis
    isSold: boolean;
    saleDate?: string;
    saleAmount?: number; // Proceeds
    expenses?: number; // Fees, commissions
    notes?: string;
    ownerId?: string;
}

export interface FinancialSimulation {
    id: string;
    name: string;
    monthlyIncome: number;
    inflationRate: number; // as a percentage, e.g., 3 for 3%
    projectionYears: number;
    currentAmount: number; // New field for manual FIRE tracking
    ownerId?: string;
}

export interface Achievement {
    id: string; // e.g., 'first_transaction'
    unlockedDate: string;
}

export interface SavedInsight {
    id: string;
    type: 'forecast' | 'savings';
    content: string;
    date: string;
}

export interface UserData {
    transactions: Transaction[];
    credits: Credit[];
    receipts: Receipt[];
    insurancePolicies: InsurancePolicy[];
    goals: Goal[];
    budgets: Budget[];
    dashboardShortcuts?: string[];
    dashboardWidgets?: WidgetType[];
    bottomNavShortcuts?: string[];
    incomeCategories?: Category[];
    expenseCategories?: Category[];
    hiddenDefaultIncomeCategories?: string[];
    hiddenDefaultExpenseCategories?: string[];
    expenseSubcategories?: Record<string, string[]>;
    invoiceCategories?: string[];
    insuranceSubcategories?: Record<string, string[]>;
    savedTaxReturns?: SavedTaxReturn[];
    educationProgress?: EducationProgress;
    excludedInstances?: Record<string, boolean>;
    propertyInvestments?: PropertyInvestment[];
    manualAssets?: ManualAsset[];
    financialSimulations?: FinancialSimulation[];
    investmentTransactions?: InvestmentTransaction[];
    achievements?: Achievement[];
    savedInsights?: SavedInsight[];
}

export type ActiveView = { type: 'user', id: string } | { type: 'group', id: string };

export interface AppState {
    users: User[];
    groups: Group[];
    activeView: ActiveView;
    userData: Record<string, UserData>;
}

export interface AppContextType {
    // State properties
    users: User[];
    groups: Group[];
    activeView: ActiveView;
    activeViewTarget: User | Group | null;
    groupMembers: User[];
    
    // Derived data for the active view
    transactions: Transaction[];
    credits: Credit[];
    receipts: Receipt[];
    insurancePolicies: InsurancePolicy[];
    goals: Goal[];
    budgets: Budget[];
    dashboardShortcuts: string[];
    dashboardWidgets: WidgetType[];
    bottomNavShortcuts: string[];
    alerts: Alert[];
    incomeCategories: Category[];
    expenseCategories: Category[];
    expenseSubcategories: Record<string, string[]>;
    invoiceCategories: string[];
    insuranceSubcategories: Record<string, string[]>;
    savedTaxReturns: SavedTaxReturn[];
    educationProgress: EducationProgress;
    excludedInstances: Record<string, boolean>;
    propertyInvestments: PropertyInvestment[];
    manualAssets: ManualAsset[];
    financialSimulations: FinancialSimulation[];
    investmentTransactions: InvestmentTransaction[];
    achievements: Achievement[];
    savedInsights: SavedInsight[];

    // Data Actions
    addTransaction: (transaction: Omit<Transaction, 'id'>, ownerId?: string) => void;
    updateTransaction: (transaction: Transaction) => void;
    deleteTransaction: (transactionId: string) => void;
    
    addCredit: (credit: Omit<Credit, 'id'>, ownerId?: string) => void;
    updateCredit: (credit: Credit) => void;
    deleteCredit: (creditId: string) => void;
    
    addReceipt: (receipt: Omit<Receipt, 'id'> & { contractFileData?: string }, ownerId?: string) => void;
    updateReceipt: (receipt: Receipt, newContractFileData?: string) => void;
    deleteReceipt: (receiptId: string) => void;
    
    addInsurancePolicy: (policy: Omit<InsurancePolicy, 'id'> & { contractFileData?: string }, ownerId?: string) => void;
    updateInsurancePolicy: (policy: InsurancePolicy, newContractFileData?: string) => void;
    deleteInsurancePolicy: (policyId: string) => void;

    addGoal: (goal: Omit<Goal, 'id' | 'contributionHistory'>, ownerId?: string) => void;
    updateGoal: (goal: Goal) => void;
    deleteGoal: (goalId: string) => void;
    addFundsToGoal: (goalId: string, amount: number, description?: string) => void;
    updateGoalContribution: (goalId: string, contribution: GoalContribution) => void;
    deleteGoalContribution: (goalId: string, contributionId: string) => void;
    
    addBudget: (budget: Omit<Budget, 'id' | 'contributionHistory'>, ownerId?: string) => void;
    updateBudget: (budget: Budget) => void;
    deleteBudget: (budgetId: string) => void;
    addFundsToBudget: (budgetId: string, amount: number, description: string | undefined) => void;
    updateBudgetContribution: (budgetId: string, contribution: BudgetContribution) => void;
    deleteBudgetContribution: (budgetId: string, contributionId: string) => void;

    addPropertyInvestment: (investment: Omit<PropertyInvestment, 'id'>, ownerId?: string) => void;
    updatePropertyInvestment: (investment: PropertyInvestment) => void;
    deletePropertyInvestment: (investmentId: string) => void;

    addManualAsset: (asset: Omit<ManualAsset, 'id'>, ownerId?: string) => void;
    updateManualAsset: (asset: ManualAsset) => void;
    deleteManualAsset: (assetId: string) => void;

    addFinancialSimulation: (simulation: Omit<FinancialSimulation, 'id'>, ownerId?: string) => void;
    updateFinancialSimulation: (simulation: FinancialSimulation) => void;
    deleteFinancialSimulation: (simulationId: string) => void;

    addInvestmentTransaction: (investment: Omit<InvestmentTransaction, 'id'>, ownerId?: string) => void;
    updateInvestmentTransaction: (investment: InvestmentTransaction) => void;
    deleteInvestmentTransaction: (investmentId: string) => void;
    
    updateDashboardShortcuts: (shortcuts: string[]) => void;
    updateDashboardWidgets: (widgets: WidgetType[]) => void;
    updateBottomNavShortcuts: (shortcuts: string[]) => void;

    updateCreditToxicity: (creditId: string, report: ToxicityReport) => void;
    deleteCreditToxicity: (creditId: string) => void;
    
    // User & Group Management
    addUser: (name: string) => void;
    updateUser: (userId: string, updates: Partial<Omit<User, 'id'>>) => void;
    switchView: (view: ActiveView) => void;
    addGroup: (name: string, userIds: string[]) => void;
    updateGroup: (groupId: string, name: string, userIds: string[]) => void;
    deleteGroup: (groupId: string) => void;

    // Category Management
    addIncomeCategory: (category: Omit<Category, 'id'>) => void;
    addExpenseCategory: (category: Omit<Category, 'id'>) => void;
    updateIncomeCategory: (categoryId: string, updates: Partial<Omit<Category, 'id'>>) => void;
    deleteIncomeCategory: (categoryId: string) => void;
    updateExpenseCategory: (categoryId: string, updates: Partial<Omit<Category, 'id'>>) => void;
    deleteExpenseCategory: (categoryId: string) => void;
    addExpenseSubcategory: (category: string, subcategory: string) => void;
    updateExpenseSubcategory: (category: string, oldName: string, newName: string) => void;
    deleteExpenseSubcategory: (category: string, subcategory: string) => void;
    addInvoiceCategory: (category: string, ownerId: string) => void;
    addInsuranceSubcategory: (policyType: InsurancePolicyType, subcategory: string) => void;
    updateInsuranceSubcategory: (policyType: InsurancePolicyType, oldName: string, newName: string) => void;
    deleteInsuranceSubcategory: (policyType: InsurancePolicyType, subcategory: string) => void;
    
    // Taxation Management
    addSavedTaxReturn: (returnData: Omit<SavedTaxReturn, 'id' | 'dateSaved'>) => void;
    deleteSavedTaxReturn: (returnId: string) => void;
    
    // Education Management
    updateEducationProgress: (progress: Partial<EducationProgress>) => void;
    
    // Transaction Exclusion
    toggleTransactionInstanceExclusion: (instanceId: string) => void;
    getExpandedTransactionsForYear: (targetYear: number) => (Transaction & { instanceId: string, isExcluded?: boolean })[];

    // Gamification
    grantAchievement: (achievementId: string) => void;
    
    // AI Insights History
    addSavedInsight: (insight: Omit<SavedInsight, 'id'>) => void;
    deleteSavedInsight: (insightId: string) => void;
}

// --- Taxation Module Types ---

export interface TaxDraftData {
  grossIncome: number;
  withholdings: number;
  socialSecurity: number;
  draftResult: number; // Positive if to pay, negative if to be returned
}

export interface RentedProperty {
    id: string;
    name: string;
    income: number;
    expenses: number;
}

export interface TaxQuestionnaire {
  // A
  personal_civilStatus: 'single' | 'married' | 'widowed' | 'divorced';
  personal_autonomousCommunity: string;
  personal_hasChildren: boolean;
  personal_childrenCount: number;
  personal_childrenDisability: boolean;
  personal_childrenDisabilityGrade: number;
  personal_isLargeFamily: 'none' | 'general' | 'special';
  personal_hasAscendants: boolean;
  personal_ascendantsDisability: boolean;
  personal_ascendantsDisabilityGrade: number;
  // B
  housing_isOwner: boolean;
  housing_isRenter: boolean;
  housing_mortgage_boughtBefore2013: boolean;
  housing_mortgage_paidAmount: number;
  housing_rent_contractDate: string;
  housing_rent_paidAmount: number;
  housing_efficiencyImprovements: boolean;
  housing_efficiencyAmount: number;
  // C
  rented_properties: RentedProperty[];
  // D
  care_daycareExpenses: number;
  care_educationExpenses: number;
  // E
  work_isAutonomous: boolean;
  work_autonomousIncome: number;
  work_autonomousExpenses: number;
  work_pensionPlanContributions: number;
  work_investmentGainsLosses: number;
  // F
  donations_ngo: number;
  donations_unionDues: number;
  donations_privateHealthInsurance: number;
  // G
  regional_gymFee: number;
  regional_birthAdoption: number;
  regional_publicTransport: number;
}

export interface TaxDeduction {
  description: string;
  amount: number; // The amount of the expense/contribution
  impactOnResult: number; // The calculated impact on the final tax payment
}

export interface TaxCalculationResult {
  draftResult: number;
  adjustedResult: number;
  advice: string;
  deductions: TaxDeduction[];
}

export interface SavedTaxReturn {
    id: string;
    year: number;
    fileName: string;
    pdfData: string;
    calculationResult: TaxCalculationResult;
    dateSaved: string;
    ownerId?: string;
}

// --- AI Chat Assistant Types ---
export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    isLoading?: boolean;
}

// --- Education Module Types ---

export interface EducationMilestone {
    id: string;
    text: string;
    date: string;
}

export interface EducationProgress {
    // The highest level the user has *finished*. Starts at 0.
    // Finishing level 1 sets this to 1, unlocking level 2.
    completedLevel: number; 
    
    // Tracks state of individual checklist items within a level
    checklistStates: {
        [level: number]: boolean[];
    };
    milestones: EducationMilestone[];
}