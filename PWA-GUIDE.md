# Guía de PWA - Aviation Calculators

## ✅ Configuración Completada

Tu aplicación ahora está configurada como una Progressive Web App (PWA) con funcionalidad offline.

## 🚀 Características Implementadas

### 1. **Manifest Web App**
- ✅ Configurado en `/public/site.webmanifest`
- ✅ Iconos para Android (192x192, 512x512)
- ✅ Icono para iOS (Apple Touch Icon)
- ✅ Colores de tema personalizados

### 2. **Service Worker**
- ✅ Generado automáticamente en producción
- ✅ Cacheo inteligente de recursos
- ✅ Funcionamiento offline
- ✅ Actualización automática

### 3. **Estrategias de Cacheo**

#### **Recursos que funcionan offline:**
- ✅ **TAS Calculator**: Totalmente funcional sin conexión
- ✅ **Wind Calculator**: Totalmente funcional sin conexión
- ✅ **Flight Planning**: Totalmente funcional sin conexión
- ✅ **Conversions**: Totalmente funcional sin conexión
- ⚠️ **Distance Calculator**: La búsqueda de ciudades requiere conexión (API de geocoding)

#### **Estrategias de cacheo por tipo de recurso:**
- **Fuentes de Google**: CacheFirst (365 días)
- **Imágenes**: StaleWhileRevalidate (24 horas)
- **JavaScript/CSS**: StaleWhileRevalidate (24 horas)
- **Data JSON**: NetworkFirst (24 horas)
- **API de búsqueda**: Excluida del cache (requiere conexión)

### 4. **Página Offline**
- ✅ Página personalizada en `/offline`
- ✅ Muestra qué funciones están disponibles sin conexión
- ✅ Botón para reintentar conexión

## 📱 Cómo Instalar la PWA

### En Android (Chrome/Edge):
1. Abre la aplicación en el navegador
2. Toca el menú (⋮) → "Instalar aplicación" o "Agregar a pantalla de inicio"
3. Confirma la instalación

### En iOS (Safari):
1. Abre la aplicación en Safari
2. Toca el botón de compartir (□↑)
3. Selecciona "Agregar a pantalla de inicio"
4. Confirma el nombre y toca "Agregar"

### En Desktop (Chrome/Edge):
1. Abre la aplicación en el navegador
2. Busca el ícono de instalación en la barra de direcciones (+)
3. Haz clic en "Instalar"

## 🧪 Cómo Probar la Funcionalidad Offline

### Método 1: DevTools (Chrome/Edge)
1. Abre las DevTools (F12)
2. Ve a la pestaña "Application" → "Service Workers"
3. Marca "Offline" para simular sin conexión
4. Navega por la aplicación

### Método 2: Modo Avión
1. Instala la PWA en tu dispositivo
2. Activa el modo avión
3. Abre la aplicación desde el ícono instalado
4. Verifica que las calculadoras funcionan

### Método 3: Network Throttling
1. Abre DevTools (F12)
2. Ve a la pestaña "Network"
3. Cambia "No throttling" a "Offline"
4. Recarga la página

## 🔧 Scripts de Desarrollo

```bash
# Desarrollo (PWA deshabilitada)
npm run dev

# Build de producción (genera Service Worker)
npm run build

# Servidor de producción
npm run start
```

## 📋 Verificar la Instalación

### Lighthouse Audit
1. Abre DevTools (F12)
2. Ve a la pestaña "Lighthouse"
3. Selecciona "Progressive Web App"
4. Haz clic en "Analyze page load"

### Checklist PWA:
- ✅ Manifest web app presente
- ✅ Service Worker registrado
- ✅ Funciona offline
- ✅ HTTPS (en producción)
- ✅ Iconos en múltiples tamaños
- ✅ Página de respaldo offline
- ✅ Metadatos para instalación

## 📁 Archivos Generados

Los siguientes archivos se generan automáticamente durante el build:

```
public/
├── sw.js              # Service Worker principal
├── workbox-*.js       # Librería de cacheo
└── sw.js.map          # Source maps (dev)
```

**Nota**: Estos archivos están en `.gitignore` y no deben ser commiteados.

## 🔄 Actualizaciones

El Service Worker se actualiza automáticamente cuando:
1. El usuario cierra todas las pestañas de la aplicación
2. Se detecta una nueva versión al recargar

Para forzar una actualización inmediata, el usuario puede:
- Cerrar y reabrir la aplicación
- Refrescar la página (la actualización se aplicará en la siguiente visita)

## 🐛 Troubleshooting

### El Service Worker no se registra
- Verifica que estés en producción (`npm run build && npm run start`)
- Los Service Workers requieren HTTPS (excepto en localhost)

### Los cambios no se reflejan
- El Service Worker cachea agresivamente
- Borra el cache en DevTools → Application → Storage → Clear site data
- En producción, espera a que se actualice automáticamente

### La página offline no aparece
- Verifica que `/offline` esté construido
- Comprueba la configuración en `next.config.ts`

## 📝 Notas Importantes

1. **Desarrollo**: La PWA está deshabilitada en modo desarrollo para facilitar el debugging
2. **Build**: Usa `--webpack` flag porque Next.js 16 usa Turbopack por defecto
3. **API de Geocoding**: No se cachea para mantener resultados actualizados
4. **Cache Storage**: Se limpia automáticamente según las políticas configuradas

## 🌐 Más Información

- [Next PWA Documentation](https://ducanh-next-pwa.vercel.app/)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN Service Worker Guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
