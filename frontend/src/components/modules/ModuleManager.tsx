import { useState } from 'react';
import FolderManager from './FolderManager';
import ModuleList from './ModuleList';

interface ModuleManagerProps {
  classId: number;
  canEdit: boolean | null;
}

const ModuleManager = ({ classId, canEdit }: ModuleManagerProps) => {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1">
        <FolderManager
          classId={classId}
          onFolderSelect={setSelectedFolderId}
          selectedFolderId={selectedFolderId}
          canEdit={canEdit}
        />
      </div>
      <div className="md:col-span-2">
        <ModuleList
          classId={classId}
          folderId={selectedFolderId}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
};

export default ModuleManager;
