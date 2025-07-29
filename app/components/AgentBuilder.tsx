'use client';

import { useEffect, useRef, useState } from 'react';
import { Paintbrush, Code2, Smartphone, Monitor } from 'lucide-react';

interface AgentBuilderProps {
  agentIdea: string;
  setAgentIdea: (idea: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function AgentBuilder({ agentIdea, setAgentIdea, onGenerate, isGenerating }: AgentBuilderProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (editorRef.current && !editor) {
      // Dynamically import GrapesJS to avoid SSR issues
      import('grapesjs').then((grapesjs) => {
        const gjs = grapesjs.default;
        
        const newEditor = gjs.init({
          container: editorRef.current!,
          height: '100%',
          width: '100%',
          storageManager: false,
          canvas: {
            styles: [
              'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css'
            ],
            scripts: [
              'https://code.jquery.com/jquery-3.3.1.slim.min.js',
              'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js'
            ]
          },
          blockManager: {
            appendTo: undefined, // Remove sidebar elements for full canvas
          },
          layerManager: {
            appendTo: undefined,
          },
          traitManager: {
            appendTo: undefined,
          },
          selectorManager: {
            appendTo: undefined,
          },
          panels: {
            defaults: []
          },
          deviceManager: {
            devices: [
              {
                name: 'Desktop',
                width: '',
              },
              {
                name: 'Mobile',
                width: '320px',
                widthMedia: '480px',
              }
            ]
          },
          plugins: [
            'gjs-blocks-basic',
            'gjs-plugin-forms',
            'gjs-preset-webpage'
          ],
          pluginsOpts: {
            'gjs-blocks-basic': { flexGrid: true },
            'gjs-preset-webpage': {
              modalImportTitle: 'Import Template',
              modalImportLabel: '<div>Import your template here</div>',
              modalImportContent: function(editor: any) {
                return editor.getHtml() + '<style>' + editor.getCss() + '</style>';
              },
            }
          }
        });

        // Start with empty content - will be populated when agent is generated
        newEditor.setComponents(`
          <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
            <div class="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
              <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
              </div>
              <h2 class="text-xl font-semibold text-gray-800 mb-2">No Agent Generated Yet</h2>
              <p class="text-gray-600 mb-6">Describe your agent idea and generate it to see the custom interface here.</p>
              <div class="bg-blue-50 rounded-lg p-4">
                <p class="text-sm text-blue-700">The frontend will be generated dynamically based on your agent's specific needs and capabilities.</p>
              </div>
            </div>
          </div>
        `);

        newEditor.setStyle(`
          .container { font-family: system-ui, -apple-system, sans-serif; }
          .bg-white { background-color: white; }
          .rounded-lg { border-radius: 0.5rem; }
          .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
          .p-8 { padding: 2rem; }
          .p-6 { padding: 1.5rem; }
          .p-4 { padding: 1rem; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .max-w-4xl { max-width: 56rem; }
          .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .font-bold { font-weight: 700; }
          .font-medium { font-weight: 500; }
          .text-gray-800 { color: #1f2937; }
          .text-gray-700 { color: #374151; }
          .text-gray-600 { color: #4b5563; }
          .mb-6 { margin-bottom: 1.5rem; }
          .mb-2 { margin-bottom: 0.5rem; }
          .mt-8 { margin-top: 2rem; }
          .space-y-6 > * + * { margin-top: 1.5rem; }
          .block { display: block; }
          .w-full { width: 100%; }
          .px-4 { padding-left: 1rem; padding-right: 1rem; }
          .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
          .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
          .border { border-width: 1px; }
          .border-gray-300 { border-color: #d1d5db; }
          .bg-blue-600 { background-color: #2563eb; }
          .bg-gray-50 { background-color: #f9fafb; }
          .text-white { color: white; }
          .italic { font-style: italic; }
          .resize-none { resize: none; }
          .transition-colors { transition-property: color, background-color, border-color; transition-duration: 150ms; }
          .hover\\:bg-blue-700:hover { background-color: #1d4ed8; }
          .focus\\:ring-2:focus { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5); }
          .focus\\:ring-blue-500:focus { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5); }
          .focus\\:border-transparent:focus { border-color: transparent; }
        `);

        // Add custom CSS to ensure canvas fills the space
        const style = document.createElement('style');
        style.textContent = `
          .gjs-cv-canvas {
            width: 100% !important;
            height: 100% !important;
            min-height: calc(100vh - 250px) !important;
          }
          .gjs-frame {
            width: 100% !important;
            height: 100% !important;
            min-height: calc(100vh - 250px) !important;
          }
          .gjs-editor {
            height: 100% !important;
            min-height: calc(100vh - 200px) !important;
          }
          .gjs-cv-canvas__frames {
            height: 100% !important;
            min-height: calc(100vh - 250px) !important;
          }
          .gjs-cv-canvas .gjs-frame-wrapper {
            height: 100% !important;
            min-height: calc(100vh - 250px) !important;
          }
        `;
        document.head.appendChild(style);

        // Force canvas refresh and resize
        setTimeout(() => {
          newEditor.refresh();
          newEditor.trigger('canvas:update');
        }, 100);

        // Add resize listener to update canvas on window resize
        const handleResize = () => {
          if (newEditor) {
            newEditor.refresh();
          }
        };
        window.addEventListener('resize', handleResize);

        // Add event listener for updating GrapesJS content when agent is generated
        const handleContentUpdate = (event: any) => {
          if (newEditor && event.detail?.frontendCode) {
            // Extract HTML content from the generated frontend code
            const htmlMatch = event.detail.frontendCode.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            const htmlContent = htmlMatch ? htmlMatch[1] : event.detail.frontendCode;
            
            newEditor.setComponents(htmlContent);
            newEditor.refresh();
          }
        };
        window.addEventListener('updateGrapesJSContent', handleContentUpdate);

        setEditor(newEditor);
      }).catch(error => {
        console.error('Failed to load GrapesJS:', error);
      });
    }

    return () => {
      if (editor) {
        editor.destroy();
      }
      // Clean up event listeners
      window.removeEventListener('resize', () => {});
      window.removeEventListener('updateGrapesJSContent', () => {});
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <Paintbrush className="w-5 h-5 mr-2" />
            Frontend Builder
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setViewMode('desktop');
              if (editor) {
                editor.setDevice('Desktop');
                editor.refresh();
              }
            }}
            className={`p-2 rounded-lg ${viewMode === 'desktop' ? 'bg-purple-600' : 'bg-white/10'} text-white transition-colors`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setViewMode('mobile');
              if (editor) {
                editor.setDevice('Mobile');
                editor.refresh();
              }
            }}
            className={`p-2 rounded-lg ${viewMode === 'mobile' ? 'bg-purple-600' : 'bg-white/10'} text-white transition-colors`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div ref={editorRef} className="h-full w-full" />
        
        {/* Loading overlay */}
        {!editor && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <div>Loading Visual Editor...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 