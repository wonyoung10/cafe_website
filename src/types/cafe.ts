export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CafeLocation {
  address: string;
  postalCode: string;
  coordinates: Coordinates;
  mapEmbedUrl: string;
  mapViewUrl: string;
  naverMapUrl: string;
  kakaoMapUrl: string;
  description: string;
  notice: string;
}

export interface BrandValue {
  id: string;
  title: string;
  description: string;
}

export interface BrandInfo {
  name: string;
  nameEn: string;
  isTemporaryName: boolean;
  tagline: string;
  subTagline: string;
  philosophy: string;
  story: readonly string[];
  values: readonly BrandValue[];
}
