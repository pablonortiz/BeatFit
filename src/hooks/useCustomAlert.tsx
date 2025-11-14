import { useState, useCallback } from 'react';
import { AlertButton } from '../components/CustomAlert';

interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  icon?: any;
  iconColor?: string;
}

export function useCustomAlert() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      icon?: any,
      iconColor?: string
    ) => {
      // Si no hay botones, agregar uno por defecto
      const alertButtons = buttons && buttons.length > 0
        ? buttons
        : [{ text: 'OK', style: 'default' as const }];

      setAlertConfig({
        title,
        message,
        buttons: alertButtons,
        icon,
        iconColor,
      });
      setVisible(true);
    },
    []
  );

  const hideAlert = useCallback(() => {
    setVisible(false);
    // Limpiar config después de la animación
    setTimeout(() => {
      setAlertConfig(null);
    }, 200);
  }, []);

  return {
    alertConfig,
    visible,
    showAlert,
    hideAlert,
  };
}
