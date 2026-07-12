import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../supabase";
import { useFinance } from "./FinanceContext";
import {
  TaxProfile,
  TaxConfiguration,
  TaxCalculationRecord,
  TaxSlab
} from "../types";

interface TaxContextType {
  taxProfiles: TaxProfile[];
  taxConfigurations: TaxConfiguration[];
  taxCalculations: TaxCalculationRecord[];
  loading: boolean;

  // Profile operations
  addTaxProfile: (profile: Omit<TaxProfile, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<string>;
  updateTaxProfile: (id: string, profile: Partial<TaxProfile>) => Promise<void>;
  deleteTaxProfile: (id: string) => Promise<void>;

  // Configuration operations
  addTaxConfiguration: (config: Omit<TaxConfiguration, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<string>;
  updateTaxConfiguration: (id: string, config: Partial<TaxConfiguration>) => Promise<void>;
  deleteTaxConfiguration: (id: string) => Promise<void>;
  activateTaxConfiguration: (id: string, taxYear: string) => Promise<void>;

  // Calculation operations
  addTaxCalculation: (record: Omit<TaxCalculationRecord, "id" | "userId" | "createdDate">) => Promise<string>;
  updateTaxCalculation: (id: string, record: Partial<TaxCalculationRecord>) => Promise<void>;
  deleteTaxCalculation: (id: string) => Promise<void>;
  
  // Seed initial tax rules
  seedDefaultTaxConfig: () => Promise<void>;
}

const TaxContext = createContext<TaxContextType | undefined>(undefined);

export const useTax = () => {
  const context = useContext(TaxContext);
  if (!context) throw new Error("useTax must be used within a TaxProvider");
  return context;
};

const DEFAULT_SLABS_25_26: TaxSlab[] = [
  { min: 0, max: 350000, rate: 0 },
  { min: 350000, max: 450000, rate: 5 },
  { min: 450000, max: 750000, rate: 10 },
  { min: 750000, max: 1150000, rate: 15 },
  { min: 1150000, max: 1650000, rate: 20 },
  { min: 1650000, max: null, rate: 25 }
];

// --- MAPPING HELPERS FOR TAX ENTITIES ---

const mapTaxProfileFromDb = (row: any): TaxProfile => ({
  id: row.id,
  userId: row.user_id,
  taxpayerName: row.taxpayer_name,
  tin: row.tin,
  taxYear: row.tax_year,
  assessmentYear: row.assessment_year,
  residencyStatus: row.residency_status,
  genderCategory: row.gender_category,
  dateOfBirth: row.date_of_birth,
  employmentStatus: row.employment_status,
  mainSourceOfIncome: row.main_source_of_income,
  taxJurisdiction: row.tax_jurisdiction,
  notes: row.notes || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapTaxConfigFromDb = (row: any): TaxConfiguration => ({
  id: row.id,
  userId: row.user_id,
  taxYear: row.tax_year,
  isActive: !!row.is_active,
  taxFreeThreshold: Number(row.tax_free_threshold) || 0,
  specialThresholds: row.special_thresholds || {},
  minimumTax: row.minimum_tax || {},
  investmentRebateRate: Number(row.investment_rebate_rate) || 0,
  rebatePercentageOfIncome: Number(row.rebate_percentage_of_income) || 0,
  maxRebateLimit: Number(row.max_rebate_limit) || 0,
  surchargeRates: Array.isArray(row.surcharge_rates) ? row.surcharge_rates : [],
  roundingRule: row.rounding_rule,
  slabs: Array.isArray(row.slabs) ? row.slabs : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapTaxCalculationFromDb = (row: any): TaxCalculationRecord => ({
  id: row.id,
  userId: row.user_id,
  taxYear: row.tax_year,
  assessmentYear: row.assessment_year,
  profileId: row.profile_id,
  profile: row.profile || {},
  status: row.status as "Draft" | "Under Review" | "Finalized",
  version: Number(row.version) || 1,
  createdDate: row.created_date,
  finalizedDate: row.finalized_date || undefined,
  incomeItems: Array.isArray(row.income_items) ? row.income_items : [],
  salaryDetails: row.salary_details || {},
  deductions: Array.isArray(row.deductions) ? row.deductions : [],
  exemptIncomes: Array.isArray(row.exempt_incomes) ? row.exempt_incomes : [],
  taxPaidItems: Array.isArray(row.tax_paid_items) ? row.tax_paid_items : [],
  taxConfigUsed: row.tax_config_used || {},
  summary: row.summary || {},
  notes: row.notes || undefined,
  preparedBy: row.prepared_by,
  preparationDate: row.preparation_date,
  assumptions: row.assumptions || undefined,
  auditTrail: Array.isArray(row.audit_trail) ? row.audit_trail : []
});

// --- PROVIDER ---

export const TaxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useFinance();
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [taxConfigurations, setTaxConfigurations] = useState<TaxConfiguration[]>([]);
  const [taxCalculations, setTaxCalculations] = useState<TaxCalculationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const isSavingRef = useRef(false);

  const withSaveLock = async <T,>(operation: () => Promise<T>): Promise<T> => {
    if (isSavingRef.current) throw new Error("A save operation is already in progress. Please wait.");
    isSavingRef.current = true;
    try {
      return await operation();
    } finally {
      isSavingRef.current = false;
    }
  };

  const loadTaxData = async () => {
    if (!user) {
      setTaxProfiles([]);
      setTaxConfigurations([]);
      setTaxCalculations([]);
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Tax Profiles
      const { data: profs, error: profError } = await supabase
        .from("tax_profiles")
        .select("*")
        .eq("user_id", user.id);
      
      if (profError) throw profError;
      setTaxProfiles((profs || []).map(mapTaxProfileFromDb));

      // 2. Fetch Tax Configurations
      const { data: configs, error: configError } = await supabase
        .from("tax_configurations")
        .select("*")
        .eq("user_id", user.id);

      if (configError) throw configError;
      const mappedConfigs = (configs || []).map(mapTaxConfigFromDb);
      mappedConfigs.sort((a, b) => b.taxYear.localeCompare(a.taxYear));
      setTaxConfigurations(mappedConfigs);

      // 3. Fetch Tax Calculations
      const { data: calcs, error: calcError } = await supabase
        .from("tax_calculations")
        .select("*")
        .eq("user_id", user.id);

      if (calcError) throw calcError;
      const mappedCalcs = (calcs || []).map(mapTaxCalculationFromDb);
      mappedCalcs.sort((a, b) => {
        const yearCompare = b.taxYear.localeCompare(a.taxYear);
        if (yearCompare !== 0) return yearCompare;
        return (b.version || 0) - (a.version || 0);
      });
      setTaxCalculations(mappedCalcs);

    } catch (err) {
      console.error("Error loading Tax context data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxData();
  }, [user]);

  // PROFILE OPERATIONS
  const addTaxProfile = async (profile: Omit<TaxProfile, "id" | "userId" | "createdAt" | "updatedAt">): Promise<string> => {
    if (!user) throw new Error("Unauthenticated user");
    return withSaveLock(async () => {
      const pId = "prof_" + Math.random().toString(36).substr(2, 9);

      const { data, error } = await supabase.from("tax_profiles").insert({
        id: pId,
        user_id: user.id,
        taxpayer_name: profile.taxpayerName,
        tin: profile.tin,
        tax_year: profile.taxYear,
        assessment_year: profile.assessmentYear,
        residency_status: profile.residencyStatus,
        gender_category: profile.genderCategory,
        date_of_birth: profile.dateOfBirth,
        employment_status: profile.employmentStatus,
        main_source_of_income: profile.mainSourceOfIncome,
        tax_jurisdiction: profile.taxJurisdiction,
        notes: profile.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).select().single();

      if (error) throw new Error(`Failed to save tax profile: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify tax profile after saving.");

      await loadTaxData();
      return pId;
    });
  };

  const updateTaxProfile = async (id: string, profile: Partial<TaxProfile>) => {
    if (!user) return;
    return withSaveLock(async () => {
      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };
      if (profile.taxpayerName !== undefined) updatePayload.taxpayer_name = profile.taxpayerName;
      if (profile.tin !== undefined) updatePayload.tin = profile.tin;
      if (profile.taxYear !== undefined) updatePayload.tax_year = profile.taxYear;
      if (profile.assessmentYear !== undefined) updatePayload.assessment_year = profile.assessmentYear;
      if (profile.residencyStatus !== undefined) updatePayload.residency_status = profile.residencyStatus;
      if (profile.genderCategory !== undefined) updatePayload.gender_category = profile.genderCategory;
      if (profile.dateOfBirth !== undefined) updatePayload.date_of_birth = profile.dateOfBirth;
      if (profile.employmentStatus !== undefined) updatePayload.employment_status = profile.employmentStatus;
      if (profile.mainSourceOfIncome !== undefined) updatePayload.main_source_of_income = profile.mainSourceOfIncome;
      if (profile.taxJurisdiction !== undefined) updatePayload.tax_jurisdiction = profile.taxJurisdiction;
      if (profile.notes !== undefined) updatePayload.notes = profile.notes;

      const { data, error } = await supabase
        .from("tax_profiles")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update tax profile: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify tax profile after updating.");

      await loadTaxData();
    });
  };

  const deleteTaxProfile = async (id: string) => {
    if (!user) return;
    return withSaveLock(async () => {
      const { error } = await supabase
        .from("tax_profiles")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw new Error(`Failed to delete tax profile: ${error.message}`);
      await loadTaxData();
    });
  };

  // CONFIGURATION OPERATIONS
  const addTaxConfiguration = async (config: Omit<TaxConfiguration, "id" | "userId" | "createdAt" | "updatedAt">): Promise<string> => {
    if (!user) throw new Error("Unauthenticated user");
    return withSaveLock(async () => {
      const cId = "cfg_" + Math.random().toString(36).substr(2, 9);

      // Deactivate others for same taxYear
      if (config.isActive) {
        const otherConfigs = taxConfigurations.filter(c => c.taxYear === config.taxYear);
        for (const other of otherConfigs) {
          await supabase
            .from("tax_configurations")
            .update({ is_active: false })
            .eq("id", other.id)
            .eq("user_id", user.id);
        }
      }

      const { data, error } = await supabase.from("tax_configurations").insert({
        id: cId,
        user_id: user.id,
        tax_year: config.taxYear,
        is_active: !!config.isActive,
        tax_free_threshold: Number(config.taxFreeThreshold) || 0,
        special_thresholds: config.specialThresholds,
        minimum_tax: config.minimumTax,
        investment_rebate_rate: Number(config.investmentRebateRate) || 0,
        rebate_percentage_of_income: Number(config.rebatePercentageOfIncome) || 0,
        max_rebate_limit: Number(config.maxRebateLimit) || 0,
        surcharge_rates: config.surchargeRates,
        rounding_rule: config.roundingRule,
        slabs: config.slabs,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).select().single();

      if (error) throw new Error(`Failed to save tax configuration: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify tax configuration after saving.");

      await loadTaxData();
      return cId;
    });
  };

  const updateTaxConfiguration = async (id: string, config: Partial<TaxConfiguration>) => {
    if (!user) return;
    return withSaveLock(async () => {
      if (user.id === 'preview-admin') {
        let currentConfigs = [...taxConfigurations];
        if (config.isActive) {
          const targetYear = config.taxYear || currentConfigs.find(c => c.id === id)?.taxYear;
          if (targetYear) {
            currentConfigs = currentConfigs.map(c => {
              if (c.taxYear === targetYear && c.id !== id) {
                return { ...c, isActive: false, updatedAt: new Date().toISOString() };
              }
              return c;
            });
          }
        }
        const updated = currentConfigs.map(c => {
          if (c.id === id) {
            return {
              ...c,
              ...config,
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        });
        localStorage.setItem(`tax_configurations_${user.id}`, JSON.stringify(updated));
        setTaxConfigurations(updated);
        return;
      }

      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };
      if (config.taxYear !== undefined) updatePayload.tax_year = config.taxYear;
      if (config.isActive !== undefined) updatePayload.is_active = !!config.isActive;
      if (config.taxFreeThreshold !== undefined) updatePayload.tax_free_threshold = Number(config.taxFreeThreshold) || 0;
      if (config.specialThresholds !== undefined) updatePayload.special_thresholds = config.specialThresholds;
      if (config.minimumTax !== undefined) updatePayload.minimum_tax = config.minimumTax;
      if (config.investmentRebateRate !== undefined) updatePayload.investment_rebate_rate = Number(config.investmentRebateRate) || 0;
      if (config.rebatePercentageOfIncome !== undefined) updatePayload.rebate_percentage_of_income = Number(config.rebatePercentageOfIncome) || 0;
      if (config.maxRebateLimit !== undefined) updatePayload.max_rebate_limit = Number(config.maxRebateLimit) || 0;
      if (config.surchargeRates !== undefined) updatePayload.surcharge_rates = config.surchargeRates;
      if (config.roundingRule !== undefined) updatePayload.rounding_rule = config.roundingRule;
      if (config.slabs !== undefined) updatePayload.slabs = config.slabs;

      if (config.isActive) {
        const targetYear = config.taxYear || taxConfigurations.find(c => c.id === id)?.taxYear;
        if (targetYear) {
          const otherConfigs = taxConfigurations.filter(c => c.taxYear === targetYear && c.id !== id);
          for (const other of otherConfigs) {
            await supabase
              .from("tax_configurations")
              .update({ is_active: false })
              .eq("id", other.id)
              .eq("user_id", user.id);
          }
        }
      }

      const { data, error } = await supabase
        .from("tax_configurations")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update tax configuration: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify tax configuration after updating.");

      await loadTaxData();
    });
  };

  const deleteTaxConfiguration = async (id: string) => {
    if (!user) return;
    return withSaveLock(async () => {
      const { error } = await supabase
        .from("tax_configurations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw new Error(`Failed to delete tax configuration: ${error.message}`);
      await loadTaxData();
    });
  };

  const activateTaxConfiguration = async (id: string, taxYear: string) => {
    if (!user) return;
    return withSaveLock(async () => {
      const targetConfigs = taxConfigurations.filter(c => c.taxYear === taxYear);
      for (const c of targetConfigs) {
        await supabase
          .from("tax_configurations")
          .update({
            is_active: c.id === id,
            updated_at: new Date().toISOString()
          })
          .eq("id", c.id)
          .eq("user_id", user.id);
      }
      await loadTaxData();
    });
  };

  // CALCULATION OPERATIONS
  const addTaxCalculation = async (record: Omit<TaxCalculationRecord, "id" | "userId" | "createdDate">): Promise<string> => {
    if (!user) throw new Error("Unauthenticated user");
    return withSaveLock(async () => {
      const calcId = "calc_" + Math.random().toString(36).substr(2, 9);

      const { data, error } = await supabase.from("tax_calculations").insert({
        id: calcId,
        user_id: user.id,
        tax_year: record.taxYear,
        assessment_year: record.assessmentYear,
        profile_id: record.profileId,
        profile: record.profile,
        status: record.status,
        version: Number(record.version) || 1,
        income_items: record.incomeItems,
        salary_details: record.salaryDetails,
        deductions: record.deductions,
        exempt_incomes: record.exemptIncomes,
        tax_paid_items: record.taxPaidItems,
        tax_config_used: record.taxConfigUsed,
        summary: record.summary,
        notes: record.notes || null,
        prepared_by: record.preparedBy,
        preparation_date: record.preparationDate,
        assumptions: record.assumptions || null,
        audit_trail: record.auditTrail,
        created_date: new Date().toISOString()
      }).select().single();

      if (error) throw new Error(`Failed to save tax calculation: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify tax calculation after saving.");

      await loadTaxData();
      return calcId;
    });
  };

  const updateTaxCalculation = async (id: string, record: Partial<TaxCalculationRecord>) => {
    if (!user) return;
    return withSaveLock(async () => {
      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };
      if (record.taxYear !== undefined) updatePayload.tax_year = record.taxYear;
      if (record.assessmentYear !== undefined) updatePayload.assessment_year = record.assessmentYear;
      if (record.profileId !== undefined) updatePayload.profile_id = record.profileId;
      if (record.profile !== undefined) updatePayload.profile = record.profile;
      if (record.status !== undefined) updatePayload.status = record.status;
      if (record.version !== undefined) updatePayload.version = Number(record.version) || 1;
      if (record.incomeItems !== undefined) updatePayload.income_items = record.incomeItems;
      if (record.salaryDetails !== undefined) updatePayload.salary_details = record.salaryDetails;
      if (record.deductions !== undefined) updatePayload.deductions = record.deductions;
      if (record.exemptIncomes !== undefined) updatePayload.exempt_incomes = record.exemptIncomes;
      if (record.taxPaidItems !== undefined) updatePayload.tax_paid_items = record.taxPaidItems;
      if (record.taxConfigUsed !== undefined) updatePayload.tax_config_used = record.taxConfigUsed;
      if (record.summary !== undefined) updatePayload.summary = record.summary;
      if (record.notes !== undefined) updatePayload.notes = record.notes;
      if (record.preparedBy !== undefined) updatePayload.prepared_by = record.preparedBy;
      if (record.preparationDate !== undefined) updatePayload.preparation_date = record.preparationDate;
      if (record.assumptions !== undefined) updatePayload.assumptions = record.assumptions;
      if (record.auditTrail !== undefined) updatePayload.audit_trail = record.auditTrail;
      if (record.finalizedDate !== undefined) updatePayload.finalized_date = record.finalizedDate;

      const { data, error } = await supabase
        .from("tax_calculations")
        .update(updatePayload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update tax calculation: ${error.message}`);
      if (!data) throw new Error("Database confirmation failed: Could not verify tax calculation after updating.");

      await loadTaxData();
    });
  };

  const deleteTaxCalculation = async (id: string) => {
    if (!user) return;
    return withSaveLock(async () => {
      const { error } = await supabase
        .from("tax_calculations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw new Error(`Failed to delete tax calculation: ${error.message}`);
      await loadTaxData();
    });
  };

  return (
    <TaxContext.Provider
      value={{
        taxProfiles,
        taxConfigurations,
        taxCalculations,
        loading,
        addTaxProfile,
        updateTaxProfile,
        deleteTaxProfile,
        addTaxConfiguration,
        updateTaxConfiguration,
        deleteTaxConfiguration,
        activateTaxConfiguration,
        addTaxCalculation,
        updateTaxCalculation,
        deleteTaxCalculation
      }}
    >
      {children}
    </TaxContext.Provider>
  );
};
