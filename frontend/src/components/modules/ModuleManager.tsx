import { useState } from 'react';
import FolderManager from './FolderManager';
import ModuleList from './ModuleList';

interface ModuleManagerProps {
  classid: string;
  canEdit: boolean | null;
}

const ModuleManager = ({ classid, canEdit }: ModuleManagerProps) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1">
        <FolderManager
          classid={classid}
          onFolderSelect={setSelectedFolderId}
          selectedFolderid={selectedFolderId}
          canEdit={canEdit}
        />
      </div>
      <div className="md:col-span-2">
        <ModuleList
          classId={classid}
          folderId={selectedFolderId}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
};

export default ModuleManager;
