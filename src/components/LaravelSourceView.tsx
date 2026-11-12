import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { GitEnvironmentInfo, LaravelFile } from '../types/auth';

export function LaravelSourceView() {
  const [files, setFiles] = useState<LaravelFile[]>([]);
  const [gitInfo, setGitInfo] = useState<GitEnvironmentInfo | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [filter, setFilter] = useState('');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [copiedGit, setCopiedGit] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [filesRes, gitRes] = await Promise.all([
          apiRequest<{ files: LaravelFile[] }>('/api/laravel/files'),
          apiRequest<GitEnvironmentInfo>('/api/git/status'),
        ]);
        setFiles(filesRes.files);
        setGitInfo(gitRes);
        const preferred =
          filesRes.files.find((f) => f.path === 'routes/auth.php') ?? filesRes.files[0];
        if (preferred) setSelectedPath(preferred.path);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredFiles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.path.toLowerCase().includes(q));
  }, [files, filter]);

  const activeFile = useMemo(
    () => files.find((f) => f.path === selectedPath) ?? filteredFiles[0] ?? null,
    [files, filteredFiles, selectedPath],
  );

  const gitCommands = `unzip laravel-vue-inertia-auth.zip -d my-laravel-auth
cd my-laravel-auth
git init
git add .
git commit -m "feat: add Laravel 11 + Vue 3 Inertia authentication system with Tailwind CSS"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main`;

  async function copyFileContent(file: LaravelFile) {
    await navigator.clipboard.writeText(file.content);
    setCopiedPath(file.path);
    setTimeout(() => setCopiedPath(null), 1800);
  }

  async function copyGitCommands() {
    await navigator.clipboard.writeText(gitCommands);
    setCopiedGit(true);
    setTimeout(() => setCopiedGit(false), 1800);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            Laravel 11 + Vue 3 Inertia + Tailwind Source
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-mono tabular-nums">{files.length} production files</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Controllers, FormRequests, Inertia Middleware, Vue 3 SFCs, Ziggy routes, and PHPUnit tests</span>
          </p>
        </div>

        <a
          href="/api/laravel/download"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" />
          Download Laravel Zip
        </a>
      </div>

      {/* GitHub & Runtime Transparency Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Commit &amp; Push to Your GitHub Repository
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {gitInfo && !gitInfo.gitInitialized
                ? 'This preview sandbox runs on Node.js without a linked GitHub remote or personal access token. Download the archive above and run the commands below in your repository.'
                : 'Use the commands below to commit and push the Laravel 11 + Vue Inertia codebase to your GitHub remote.'}
            </p>
          </div>
          <button
            type="button"
            onClick={copyGitCommands}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            {copiedGit ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedGit ? 'Copied Commands' : 'Copy Git Commands'}
          </button>
        </div>

        <pre className="rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs overflow-x-auto leading-relaxed">
          {gitCommands}
        </pre>

        {gitInfo && (
          <p className="text-xs text-slate-500">
            Sandbox checks: Node.js active
            <span className="mx-2" aria-hidden="true">·</span>
            PHP binary: {gitInfo.phpAvailable ? 'available' : 'not installed in sandbox'}
            <span className="mx-2" aria-hidden="true">·</span>
            Git remote: {gitInfo.remotes.length > 0 ? gitInfo.remotes[0] : 'none configured'}
          </p>
        )}
      </section>

      {/* File Explorer */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden grid lg:grid-cols-12 min-h-[560px]">
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-200">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter files (e.g. Login.vue, Controller)..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto max-h-[520px] divide-y divide-slate-100">
            {loading ? (
              <p className="p-4 text-xs text-slate-500">Loading Laravel files...</p>
            ) : filteredFiles.length === 0 ? (
              <p className="p-4 text-xs text-slate-500">No files match "{filter}".</p>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = activeFile?.path === file.path;
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setSelectedPath(file.path)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-xs transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <FileCode2 className="w-3.5 h-3.5 shrink-0 opacity-75" />
                    <span className="font-mono truncate">{file.path}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col min-w-0">
          {activeFile ? (
            <>
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <span className="font-mono text-xs font-medium text-slate-800 truncate">
                  laravel-inertia-vue-auth/{activeFile.path}
                </span>
                <button
                  type="button"
                  onClick={() => copyFileContent(activeFile)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 whitespace-nowrap shrink-0"
                >
                  {copiedPath === activeFile.path ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedPath === activeFile.path ? 'Copied' : 'Copy File'}
                </button>
              </div>
              <pre className="flex-1 p-5 overflow-auto max-h-[520px] bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed">
                <code>{activeFile.content}</code>
              </pre>
            </>
          ) : (
            <div className="p-8 text-sm text-slate-500">Select a file to view its source.</div>
          )}
        </div>
      </section>
    </div>
  );
}
