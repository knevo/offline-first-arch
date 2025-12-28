import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator } from 'react-native';

import { db, type Database } from '@/database/client';
import { runMigrations } from '@/database/migrations';

interface DatabaseContextValue {
  database: Database;
  isInitialized: boolean;
}

const DatabaseContext = createContext<DatabaseContextValue | undefined>(
  undefined,
);

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize database when React is ready
    const initDatabase = async () => {
      try {
        // Run migrations to set up tables
        await runMigrations(db);

        setIsInitialized(true);
        console.log('✅ Database initialized successfully with Drizzle ORM');
      } catch (error) {
        console.error('❌ Failed to initialize database:', error);
      }
    };

    initDatabase();
  }, []);

  if (!isInitialized) {
    return <ActivityIndicator size='large' />;
  }

  return (
    <DatabaseContext.Provider value={{ database: db, isInitialized }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): Database {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  if (!context.database) {
    throw new Error('Database is not initialized yet');
  }
  return context.database;
}

export function useDatabaseContext(): DatabaseContextValue {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error(
      'useDatabaseContext must be used within a DatabaseProvider',
    );
  }
  return context;
}
