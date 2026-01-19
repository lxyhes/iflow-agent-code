import React, { useState } from 'react';
import { Home, ChevronRight } from 'lucide-react';
import FileTree from './FileTree';
import FileViewer from './FileViewer';

const ProjectFileExplorer = ({ project }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleSelectFile = (file) => {
    // Only select actual files, not directories (directories are handled by FileTree toggle)
    // The FileTree component calls this for files.
    setSelectedFile(file);
  };

  // Breadcrumbs helper
  const getBreadcrumbs = () => {
    if (!selectedFile) return [];
    const parts = selectedFile.path.split('/');
    return parts.map((part, index) => ({
      name: part,
      path: parts.slice(0, index + 1).join('/')
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-full bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Sidebar: Tree */}
      <div className="w-96 border-r dark:border-gray-800 flex flex-col flex-shrink-0">
         <FileTree 
           selectedProject={project} 
           onFileSelect={handleSelectFile}
           onImageSelect={handleSelectFile} // For now, treat images as files to view
         />
      </div>

      {/* Main: Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumbs Bar */}
        <div className="h-10 border-b dark:border-gray-800 flex items-center px-4 text-sm text-gray-500 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <Home className="w-4 h-4 mr-2" />
          <span className="mx-1">/</span>
          {selectedFile ? (
            breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.path}>
                <span className={i === breadcrumbs.length - 1 ? "font-medium text-gray-900 dark:text-gray-100" : ""}>
                  {crumb.name}
                </span>
                {i < breadcrumbs.length - 1 && <ChevronRight className="w-4 h-4 mx-1" />}
              </React.Fragment>
            ))
          ) : (
            <span>Select a file</span>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
           <FileViewer 
             file={selectedFile} 
             projectPath={project?.name} 
           />
        </div>
      </div>
    </div>
  );
};

export default ProjectFileExplorer;
