import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import {
  initializePurchases,
  checkPremiumStatus,
  getOfferings,
  purchasePackage,
  restorePurchases,
  addCustomerInfoUpdateListener,
  PREMIUM_ENTITLEMENT_ID,
} from "../services/purchaseService";

// ==========================================
// DEBUG MODE - Set to true to test premium features without purchase
// Set back to false before releasing to production!
// ==========================================
const DEBUG_FORCE_PREMIUM = true;

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  offering: PurchasesOffering | null;
  purchasePremium: () => Promise<{ success: boolean; error?: string }>;
  restorePurchasesAction: () => Promise<{ success: boolean; error?: string }>;
  refreshStatus: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export function PremiumProvider({ children }: PremiumProviderProps) {
  const [isPremium, setIsPremium] = useState(DEBUG_FORCE_PREMIUM);
  const [isLoading, setIsLoading] = useState(!DEBUG_FORCE_PREMIUM);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

  // Initialize RevenueCat and check status
  useEffect(() => {
    // Skip initialization in debug mode
    if (DEBUG_FORCE_PREMIUM) {
      console.log("[PremiumContext] DEBUG MODE: Premium features enabled");
      setIsLoading(false);
      return;
    }

    async function initialize() {
      try {
        await initializePurchases();

        // Check current premium status
        const premium = await checkPremiumStatus();
        setIsPremium(premium);

        // Get available offerings
        const currentOffering = await getOfferings();
        setOffering(currentOffering);
      } catch (error) {
        console.error("[PremiumContext] Initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    }

    initialize();

    // Listen for customer info updates
    const unsubscribe = addCustomerInfoUpdateListener((customerInfo) => {
      if (DEBUG_FORCE_PREMIUM) return;
      const premium =
        customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
      setIsPremium(premium);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Refresh premium status
  const refreshStatus = useCallback(async () => {
    if (DEBUG_FORCE_PREMIUM) return;
    try {
      setIsLoading(true);
      const premium = await checkPremiumStatus();
      setIsPremium(premium);
    } catch (error) {
      console.error("[PremiumContext] Error refreshing status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Purchase premium subscription
  const purchasePremium = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    if (!offering?.monthly) {
      // Try to find any available package
      const pkg = offering?.availablePackages?.[0];
      if (!pkg) {
        return { success: false, error: "No subscription packages available" };
      }
      return purchasePackageAction(pkg);
    }
    return purchasePackageAction(offering.monthly);
  }, [offering]);

  const purchasePackageAction = async (
    pkg: PurchasesPackage
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const result = await purchasePackage(pkg);

      if (result.success) {
        setIsPremium(true);
        return { success: true };
      }
      return { success: false };
    } catch (error: any) {
      console.error("[PremiumContext] Purchase error:", error);
      return { success: false, error: error.message || "Purchase failed" };
    } finally {
      setIsLoading(false);
    }
  };

  // Restore purchases
  const restorePurchasesAction = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      setIsLoading(true);
      const result = await restorePurchases();

      if (result.success) {
        setIsPremium(true);
        return { success: true };
      }
      return { success: false, error: "No active subscription found" };
    } catch (error: any) {
      console.error("[PremiumContext] Restore error:", error);
      return { success: false, error: error.message || "Restore failed" };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: PremiumContextType = {
    isPremium,
    isLoading,
    offering,
    purchasePremium,
    restorePurchasesAction,
    refreshStatus,
  };

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextType {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
}
