export const FEATURES = {
    // Payments — enable when Stripe account is activated
    STRIPE_PAYMENTS: false,
    // Video HLS streaming — enable when paid transcoding is available
    VIDEO_HLS: false,
    // Background jobs via Bull — enable when Redis is upgraded
    BACKGROUND_JOBS: false,
    // Future phases
    AI_RECOMMENDATIONS: false,
    LIVE_CLASSES: false,
    MULTI_TENANT: false,
    GAMIFICATION: false,
} as const;
export type FeatureKey = keyof typeof FEATURES;
export const isEnabled = (feature: FeatureKey): boolean => {
    return FEATURES[feature];
};