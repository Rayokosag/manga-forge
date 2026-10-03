import { Plus, Trash2, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEntityDraft } from '@/hooks/useEntityDraft';
import { useAiStore } from '@/store/useAiStore';
import { AI_AGENT_ROLES, AI_PROVIDERS, type AiParams, type AiSetting } from '@/db/schema';

export function ConnectionsPanel() {
  const settings = useAiStore((s) => s.settings);
  const create = useAiStore((s) => s.createSetting);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Local model connections</h3>
          <p className="text-xs text-muted-foreground">
            Fully local by default. Ollama drives the text agents; ComfyUI renders panels. Cloud
            providers are optional fallbacks.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void create({})}>
          <Plus /> Add connection
        </Button>
      </div>

      {settings.map((s) => (
        <ConnectionCard key={s.id} setting={s} />
      ))}
    </div>
  );
}

function ConnectionCard({ setting }: { setting: AiSetting }) {
  const update = useAiStore((s) => s.updateSetting);
  const remove = useAiStore((s) => s.deleteSetting);
  const test = useAiStore((s) => s.testConnection);
  const testing = useAiStore((s) => s.testing[setting.id]);

  const { draft, setField } = useEntityDraft<AiSetting>(setting, (patch) =>
    update(setting.id, patch),
  );
  const params = (draft.params ?? {}) as AiParams;
  const setParam = (patch: Partial<AiParams>) => setField('params', { ...params, ...patch });
  const isComfy = draft.provider === 'comfyui';
  const isOllama = draft.provider === 'ollama';

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <Input
          value={draft.label}
          onChange={(e) => setField('label', e.target.value)}
          className="h-8 flex-1 font-medium"
        />
        {draft.isDefault && <Badge variant="secondary">default</Badge>}
        <Button
          variant="outline"
          size="sm"
          disabled={testing}
          onClick={() => void test(setting.id)}
        >
          <Wifi /> {testing ? 'Testing…' : 'Test'}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => void remove(setting.id)}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Provider</Label>
          <Select value={draft.provider} onValueChange={(v) => setField('provider', v as AiSetting['provider'])}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Agent role</Label>
          <Select value={draft.agentRole} onValueChange={(v) => setField('agentRole', v as AiSetting['agentRole'])}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_AGENT_ROLES.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{isComfy ? 'Checkpoint' : 'Model'}</Label>
          <Input
            value={draft.model ?? ''}
            placeholder={isComfy ? 'sd_xl_base_1.0.safetensors' : 'llama3'}
            onChange={(e) => setField('model', e.target.value)}
            className="h-8"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Endpoint</Label>
        <Input
          value={draft.endpoint}
          onChange={(e) => setField('endpoint', e.target.value)}
          className="h-8 font-mono text-xs"
        />
      </div>

      {/* provider-specific params */}
      {isOllama && (
        <div className="grid grid-cols-2 gap-3">
          <Param label="Temperature" value={params.temperature} onChange={(v) => setParam({ temperature: v })} step={0.1} />
          <Param label="Context (num_ctx)" value={params.numCtx} onChange={(v) => setParam({ numCtx: v })} step={512} />
        </div>
      )}
      {isComfy && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Param label="Steps" value={params.steps} onChange={(v) => setParam({ steps: v })} step={1} />
            <Param label="CFG" value={params.cfgScale} onChange={(v) => setParam({ cfgScale: v })} step={0.5} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Workflow (ComfyUI API JSON — optional override)</Label>
            <Textarea
              rows={3}
              className="font-mono text-xs"
              placeholder="Leave blank to use the built-in SDXL txt2img graph. Tokens: %positive% %negative% %seed% %steps% %cfg% %width% %height% %checkpoint%"
              value={typeof params.workflow === 'string' ? params.workflow : ''}
              onChange={(e) => setParam({ workflow: e.target.value || undefined })}
            />
          </div>
        </>
      )}
      {(draft.provider === 'openai' ||
        draft.provider === 'anthropic' ||
        draft.provider === 'custom') && (
        <div className="space-y-1.5">
          <Label className="text-xs">API key env var (Vite)</Label>
          <Input
            value={draft.apiKeyRef ?? ''}
            placeholder="VITE_OPENAI_API_KEY"
            onChange={(e) => setField('apiKeyRef', e.target.value)}
            className="h-8 font-mono text-xs"
          />
        </div>
      )}

      <div className="flex items-center gap-6 pt-1">
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={!!draft.enabled} onCheckedChange={(v) => setField('enabled', v)} />
          Enabled
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Switch checked={!!draft.isDefault} onCheckedChange={(v) => setField('isDefault', v)} />
          Default for its role
        </label>
      </div>
    </div>
  );
}

function Param({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        className="h-8"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      />
    </div>
  );
}
