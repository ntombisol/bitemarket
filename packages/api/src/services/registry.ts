import type { SellerListing, SellerInfo } from "../types.js";

class Registry {
  private sellers = new Map<string, SellerListing>();

  register(listing: SellerListing): void {
    this.sellers.set(listing.id, listing);
  }

  get(id: string): SellerListing | undefined {
    return this.sellers.get(id);
  }

  list(): SellerListing[] {
    return Array.from(this.sellers.values());
  }

  /** Returns serializable info (strips handler function) */
  listInfo(): SellerInfo[] {
    return this.list().map(({ handler, ...info }) => info);
  }

  getInfo(id: string): SellerInfo | undefined {
    const seller = this.sellers.get(id);
    if (!seller) return undefined;
    const { handler, ...info } = seller;
    return info;
  }
}

export const registry = new Registry();
