export interface ClassItem {
  id: string;
  title: string;
  description: string;
  price: number;
  capacity: number;
  dates: string[];
  thumbnail: string;
  isActive: boolean;
  isSoldOut?: boolean;
}

export interface OrderItem {
  id: string;
  type: 'class' | 'dessert';
  customerName: string;
  phone: string;
  email?: string;
  content: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: any;
}

export interface ReviewItem {
  id: string;
  author: string;
  content: string;
  isDisplayed: boolean;
  createdAt: any;
}

export interface PortfolioItem {
  id: string;
  year: number;
  title: string;
  description: string;
  image: string;
  type: 'book' | 'lecture' | 'media' | 'event';
  link?: string;
}

export interface GNBMenu {
  title: string;
  path: string;
  isExternal?: boolean;
}

export interface RecipeVideo {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnail?: string;
}

export interface AppConfig {
  hero: {
    title: string;
    subtitle: string;
    image: string;
  };
  about: {
    title: string;
    content: string;
    image: string;
    quote?: string;
    chefName?: string;
  };
  gnbMenus: GNBMenu[];
  socialLinks: {
    instagram?: string;
    youtube?: string;
    blog?: string;
    github?: string;
  };
  themeColor: string;
  mapInfo: {
    title: string;
    lat: number;
    lng: number;
    address: string;
    parking: string;
    walkInfo: string;
    buttonText: string;
    buttonLink: string;
    kakaoApiKey: string;
  };
  classList?: {
    title: string;
    subtitle: string;
  };
  schedule?: {
    title: string;
    subtitle: string;
    images?: string[];
  };
  freeRecipeMedia?: {
    title: string;
    subtitle: string;
    youtubeLink?: string;
    videos: RecipeVideo[];
  };
  instagramFeed?: {
    username: string;
    title: string;
    blogTitle: string;
    blogLinkText: string;
    blogLink: string;
    accessToken?: string;
  };
  logo?: {
    text: string;
    circleText: string;
    imageUrl?: string;
  };
  footer?: {
    title?: string;
    address?: string;
    copyright?: string;
  };
  reviews?: {
    title: string;
    subtitle: string;
  };
  history?: {
    title: string;
    subtitle: string;
    items: HistoryItem[];
  };
}

export interface HistoryItem {
  year: string;
  title: string;
  description: string;
  icon: 'Globe' | 'Book' | 'Award' | 'Coffee' | 'Camera' | 'Heart';
  side: 'left' | 'right';
  link?: {
    text: string;
    url: string;
  };
}
