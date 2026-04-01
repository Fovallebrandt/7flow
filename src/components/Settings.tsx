import React, { useState } from 'react';
import { User, Package, Database, Trash2, Download, Upload, Save, Plus, X, Settings as SettingsIcon } from 'lucide-react';
import { storage, UserProfile } from '../lib/storage';
import { ProjectPhoto, ProjectPhotoStage, ProjectTimeRecord } from '../types';
import { toast } from 'sonner';
import ConfirmDialog from './ConfirmDialog';

export default function Settings({ onClose }: { onClose?: () => void }) {
  const [user, setUser] = useState<UserProfile>(storage.getUserProfile());
  const [config, setConfig] = useState(storage.getInventoryConfig());
  const [newImprovement, setNewImprovement] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSaveProfile = () => {
    const avatarLetter = user.name.charAt(0).toUpperCase() || 'U';
    const updatedUser = { ...user, avatarLetter };
    storage.saveUserProfile(updatedUser);
    setUser(updatedUser);
    toast.success('Perfil actualizado');
  };

  const handleSaveConfig = () => {
    storage.saveInventoryConfig(config);
    toast.success('Configuración de inventario guardada');
  };

  const removeItem = (type: 'improvement' | 'location', index: number) => {
    if (type === 'improvement') {
      const newOptions = config.improvementOptions.filter((_, i) => i !== index);
      setConfig({ ...config, improvementOptions: newOptions });
    } else {
      const newOptions = config.locationOptions.filter((_, i) => i !== index);
      setConfig({ ...config, locationOptions: newOptions });
    }
  };

  const addItem = (type: 'improvement' | 'location') => {
    if (type === 'improvement' && newImprovement.trim()) {
      setConfig({ ...config, improvementOptions: [...config.improvementOptions, newImprovement.trim()] });
      setNewImprovement('');
    } else if (type === 'location' && newLocation.trim()) {
      setConfig({ ...config, locationOptions: [...config.locationOptions, newLocation.trim()] });
      setNewLocation('');
    }
  };

  const handleExport = () => {
    const photos = storage.getProjects().reduce((acc, project) => {
      const before = storage.getProjectPhoto(project.id, 'before');
      const after = storage.getProjectPhoto(project.id, 'after');

      if (before || after) {
        acc[project.id] = {};
        if (before) acc[project.id]!.before = before;
        if (after) acc[project.id]!.after = after;
      }

      return acc;
    }, {} as Record<string, Partial<Record<ProjectPhotoStage, ProjectPhoto>>>);

    const data = {
      projects: storage.getProjects(),
      inventory: storage.getInventory(),
      config: storage.getInventoryConfig(),
      user: storage.getUserProfile(),
      photos,
      timeStats: storage.getProjectTimeStats(),
      logs: storage.getProjects().reduce((acc: any, p) => {
        acc[p.id] = storage.getLogs(p.id);
        return acc;
      }, {})
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `7flow_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Datos exportados correctamente');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.projects) storage.saveProjects(data.projects);
        if (data.inventory) storage.saveInventory(data.inventory);
        if (data.config) storage.saveInventoryConfig(data.config);
        if (data.user) storage.saveUserProfile(data.user);
        if (data.photos) storage.saveProjectPhotos(data.photos);
        if (Array.isArray(data.timeStats)) storage.saveProjectTimeStats(data.timeStats as ProjectTimeRecord[]);
        if (data.logs) {
          Object.entries(data.logs).forEach(([id, logs]) => {
            localStorage.setItem(`7flow_logs_${id}`, JSON.stringify(logs));
          });
        }
        storage.syncProjectTimeStats();
        toast.success('Datos importados correctamente');
        window.location.reload();
      } catch (err) {
        toast.error('Error al importar el archivo');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    setShowClearConfirm(true);
  };

  const confirmClearData = () => {
    localStorage.clear();
    toast.success('Todos los datos han sido borrados');
    window.location.href = '/';
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-app)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
            <SettingsIcon size={18} />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-[var(--text-main)]">Configuración</h2>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-2 text-[var(--text-dim)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 rounded-full transition-all active:scale-90"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-32">
        {/* User Profile Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <User size={16} className="text-[var(--accent)]" />
            <label className="label-caps !mb-0">Perfil de Usuario</label>
          </div>
          <div className="card-clean p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Tu Nombre</p>
              <input 
                type="text" 
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-main)] focus:border-[var(--accent)] focus:outline-none transition-all"
              />
            </div>
            <button 
              onClick={handleSaveProfile}
              className="w-full py-3 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <Save size={14} />
              Guardar Perfil
            </button>
          </div>
        </section>

        {/* Inventory Config Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Package size={16} className="text-[var(--accent)]" />
            <label className="label-caps !mb-0">Opciones de Inventario</label>
          </div>
          <div className="card-clean p-6 space-y-6">
            {/* Improvement Options */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Opciones de Mejora</p>
              <div className="flex flex-wrap gap-2">
                {config.improvementOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-lg">
                    <span className="text-[10px] font-medium text-[var(--text-main)]">{opt}</span>
                    <button onClick={() => removeItem('improvement', i)} className="text-red-500/50 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nueva opción..."
                  value={newImprovement}
                  onChange={(e) => setNewImprovement(e.target.value)}
                  className="flex-1 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[10px] focus:outline-none"
                />
                <button onClick={() => addItem('improvement')} className="p-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-lg">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Location Options */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Ubicaciones</p>
              <div className="flex flex-wrap gap-2">
                {config.locationOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[var(--bg-app)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-lg">
                    <span className="text-[10px] font-medium text-[var(--text-main)]">{opt}</span>
                    <button onClick={() => removeItem('location', i)} className="text-red-500/50 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Nueva ubicación..."
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="flex-1 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[10px] focus:outline-none"
                />
                <button onClick={() => addItem('location')} className="p-2 bg-[var(--accent)] text-[var(--accent-foreground)] rounded-lg">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <button 
              onClick={handleSaveConfig}
              className="w-full py-3 border border-[var(--accent)] text-[var(--accent)] rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--accent)]/5 active:scale-95 transition-all"
            >
              <Save size={14} />
              Guardar Inventario
            </button>
          </div>
        </section>

        {/* Data Management Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Database size={16} className="text-[var(--accent)]" />
            <label className="label-caps !mb-0">Gestión de Datos</label>
          </div>
          <div className="card-clean p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleExport}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all group"
              >
                <Download size={20} className="text-[var(--text-dim)] group-hover:text-[var(--accent)]" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Exportar</span>
              </button>
              <label className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-subtle)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all group cursor-pointer">
                <Upload size={20} className="text-[var(--text-dim)] group-hover:text-[var(--accent)]" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Importar</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>

            <button 
              onClick={handleClearData}
              className="w-full py-4 text-red-500/60 hover:text-red-500 text-[9px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 size={14} />
              Borrar todos los datos
            </button>
          </div>
        </section>

        <ConfirmDialog
          open={showClearConfirm}
          title="Borrar todos los datos"
          description="Se eliminarán proyectos, inventario, logs, perfil y configuración local. Esta acción no se puede deshacer."
          confirmLabel="Borrar"
          cancelLabel="Cancelar"
          destructive
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={confirmClearData}
        />
      </div>
    </div>
  );
}
