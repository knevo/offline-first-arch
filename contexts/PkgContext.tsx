import { MutationTypeEnum, type Pkg } from '@/database/schema';
import * as pkgService from '@/services/pkgService';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useMutationContext } from './MutationContext';

interface PackagesContextValue {
  pkgs: Pkg[];
  refreshPackages: () => Promise<void>;
  createPkg: () => Promise<void>;
  updatePkg: (pkgId: string, imageUri: string) => Promise<void>;
  isLoading: boolean;
}

const PkgContext = createContext<PackagesContextValue | undefined>(undefined);

interface PackagesProviderProps {
  children: ReactNode;
}

export function PkgProvider({ children }: PackagesProviderProps) {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { createMutation } = useMutationContext();

  const refreshPackages = useCallback(async () => {
    try {
      const pkgs = await pkgService.getAllPkgs();
      // Sort by created_at descending (newest first)
      const sorted = pkgs.sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      setPkgs(sorted);
    } catch (error) {
      console.error('[PackagesContext] Error loading packages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPkg = useCallback(async () => {
    const pkg = await pkgService.createPkg();
    setPkgs([...pkgs, pkg]);
    await createMutation({
      type: MutationTypeEnum.CreatePkg,
      payload: JSON.stringify({ pkgId: pkg.id }),
      pkgId: pkg.id,
    });
  }, [createMutation, pkgs]);

  const { registerPackageRefreshCallback } = useMutationContext();

  const updatePkg = useCallback(
    async (pkgId: string, imageUri: string) => {
      await pkgService.updatePkg(pkgId, imageUri);
      setPkgs((prev) =>
        prev.map((pkg) =>
          pkg.id === pkgId ? { ...pkg, imageUrl: imageUri } : pkg,
        ),
      );
      await createMutation({
        type: MutationTypeEnum.UploadImage,
        payload: JSON.stringify({ pkgId, imageUri }),
        pkgId: pkgId,
      });
    },
    [createMutation],
  );
  // Initial load of packages
  useEffect(() => {
    refreshPackages();
  }, [refreshPackages]);

  // Register callback for package refresh after sync/mutations
  useEffect(() => {
    registerPackageRefreshCallback(refreshPackages);
  }, [registerPackageRefreshCallback, refreshPackages]);

  const value: PackagesContextValue = {
    pkgs,
    refreshPackages,
    createPkg,
    updatePkg,
    isLoading,
  };

  return <PkgContext.Provider value={value}>{children}</PkgContext.Provider>;
}

export function usePkgContext(): PackagesContextValue {
  const context = useContext(PkgContext);
  if (context === undefined) {
    throw new Error('usePkgs must be used within a PackagesProvider');
  }
  return context;
}
