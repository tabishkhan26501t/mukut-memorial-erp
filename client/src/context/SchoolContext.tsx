import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { settingService } from '@/services/data.service';

interface SchoolContextType {
  schoolName: string;
  schoolLogo: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolWebsite: string;
  academicYear: string;
  principalName: string;
  refresh: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType>({
  schoolName: 'xyz school ltd',
  schoolLogo: '',
  schoolAddress: '',
  schoolPhone: '',
  schoolEmail: '',
  schoolWebsite: '',
  academicYear: '',
  principalName: '',
  refresh: async () => {},
});

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>({});

  const refresh = async () => {
    try {
      const data = await settingService.getAll();
      setSettings(data);
    } catch {
      // keep defaults
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <SchoolContext.Provider
      value={{
        schoolName: settings.school_name || 'xyz school ltd',
        schoolLogo: settings.school_logo || '',
        schoolAddress: settings.school_address || '',
        schoolPhone: settings.school_phone || '',
        schoolEmail: settings.school_email || '',
        schoolWebsite: settings.school_website || '',
        academicYear: settings.academic_year || '',
        principalName: settings.school_principal || '',
        refresh,
      }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

export const useSchool = () => useContext(SchoolContext);
