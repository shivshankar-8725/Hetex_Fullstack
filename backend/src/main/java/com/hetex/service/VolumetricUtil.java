package com.hetex.service;

public final class VolumetricUtil {

    private static final double VOLUMETRIC_DIVISOR = 5000;

    private VolumetricUtil() {}

    public static double volumetricWeight(double lengthCm, double widthCm, double heightCm) {
        return (lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR;
    }

    public static double billableWeight(double actualWeightKg, double lengthCm, double widthCm, double heightCm) {
        return Math.max(actualWeightKg, volumetricWeight(lengthCm, widthCm, heightCm));
    }

    /** Rounds up to the nearest 0.5kg slab, the way couriers bill. */
    public static double roundToSlab(double weightKg) {
        return Math.ceil(weightKg * 2) / 2;
    }
}
