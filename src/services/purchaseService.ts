import Purchases, {
  PurchasesOffering,
  CustomerInfo,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";
import { Platform } from "react-native";

// RevenueCat API Keys - Replace with your actual keys from RevenueCat dashboard
const REVENUECAT_API_KEY_IOS = "YOUR_REVENUECAT_IOS_API_KEY";
const REVENUECAT_API_KEY_ANDROID = "YOUR_REVENUECAT_ANDROID_API_KEY";

// Premium entitlement identifier - must match what you set in RevenueCat
export const PREMIUM_ENTITLEMENT_ID = "premium";

let isConfigured = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export async function initializePurchases(): Promise<void> {
  if (isConfigured) return;

  try {
    // Set log level for debugging (change to LOG_LEVEL.ERROR in production)
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    const apiKey =
      Platform.OS === "ios"
        ? REVENUECAT_API_KEY_IOS
        : REVENUECAT_API_KEY_ANDROID;

    await Purchases.configure({ apiKey });
    isConfigured = true;
    console.log("[PurchaseService] RevenueCat configured successfully");
  } catch (error) {
    console.error("[PurchaseService] Error configuring RevenueCat:", error);
    throw error;
  }
}

/**
 * Get current customer info from RevenueCat
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error("[PurchaseService] Error getting customer info:", error);
    return null;
  }
}

/**
 * Check if user has active premium subscription
 */
export async function checkPremiumStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium =
      customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
    return isPremium;
  } catch (error) {
    console.error("[PurchaseService] Error checking premium status:", error);
    return false;
  }
}

/**
 * Get available offerings (subscription packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      return offerings.current;
    }
    return null;
  } catch (error) {
    console.error("[PurchaseService] Error getting offerings:", error);
    return null;
  }
}

/**
 * Purchase a subscription package
 * @param pkg The package to purchase (e.g., monthly subscription)
 * @returns true if purchase successful, false otherwise
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ success: boolean; customerInfo?: CustomerInfo }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium =
      customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

    return { success: isPremium, customerInfo };
  } catch (error: any) {
    // Check if user cancelled
    if (error.userCancelled) {
      console.log("[PurchaseService] User cancelled purchase");
      return { success: false };
    }
    console.error("[PurchaseService] Error purchasing package:", error);
    throw error;
  }
}

/**
 * Restore previous purchases
 * @returns true if premium was restored, false otherwise
 */
export async function restorePurchases(): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium =
      customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

    return { success: isPremium, customerInfo };
  } catch (error) {
    console.error("[PurchaseService] Error restoring purchases:", error);
    throw error;
  }
}

/**
 * Get the monthly subscription package from current offering
 */
export async function getMonthlyPackage(): Promise<PurchasesPackage | null> {
  try {
    const offering = await getOfferings();
    if (offering?.monthly) {
      return offering.monthly;
    }
    // Fallback: try to find a monthly package in available packages
    if (offering?.availablePackages) {
      return (
        offering.availablePackages.find(
          (pkg) =>
            pkg.packageType === "MONTHLY" ||
            pkg.identifier.toLowerCase().includes("monthly")
        ) || null
      );
    }
    return null;
  } catch (error) {
    console.error("[PurchaseService] Error getting monthly package:", error);
    return null;
  }
}

/**
 * Format price for display
 */
export function formatPrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

/**
 * Add listener for customer info changes
 */
export function addCustomerInfoUpdateListener(
  listener: (info: CustomerInfo) => void
): () => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    // RevenueCat doesn't have removeListener, but we can return empty cleanup
    // The listener will be cleaned up when the component unmounts
  };
}
