'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save } from 'lucide-react'
import {
  getModeLabel,
  getSampleBlockBreakdown,
  calculateMessageCharge,
  type PricingRuleConfig,
} from '@/lib/utils/pricing-calculations'

export interface EditablePricingRule extends PricingRuleConfig {
  _id?: string
  scope: 'global' | 'user'
  userId?: string | { _id?: string }
  chargeFailed?: boolean
  refundOnFail?: boolean
}

interface PricingRuleFormProps {
  rule: EditablePricingRule
  title: string
  description?: string
  onChange: (rule: EditablePricingRule) => void
  onSave: () => void
  onCancel: () => void
}

function NumberField({
  label,
  value,
  onChange,
  step = '1',
  placeholder,
}: {
  label: string
  value?: number
  onChange: (value: number) => void
  step?: string
  placeholder?: string
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-slate-900 mb-2 block">{label}</Label>
      <Input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
      />
    </div>
  )
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-emerald-600 border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer transition-colors"
      />
      <span className="text-sm text-slate-900">{label}</span>
    </label>
  )
}

export function PricingRuleForm({
  rule,
  title,
  description,
  onChange,
  onSave,
  onCancel,
}: PricingRuleFormProps) {
  const previewMessage = 'A'.repeat(250)
  const previewEncoding = 'gsm7' as const
  const preview = calculateMessageCharge(previewMessage, previewEncoding, rule)

  const blockSamples =
    rule.mode === 'per_char_block'
      ? getSampleBlockBreakdown(
          rule.charsPerBlock ?? 160,
          rule.pricePerBlock ?? 0,
          rule.roundPartialBlocks !== false,
          3
        )
      : []

  return (
    <div className="space-y-5 mt-6 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <Label className="text-sm font-medium text-slate-900 mb-2 block">Pricing Mode</Label>
        <Select
          value={rule.mode || 'per_part'}
          onValueChange={(value) => onChange({ ...rule, mode: value as PricingRuleConfig['mode'] })}
        >
          <SelectTrigger className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 rounded-xl shadow-lg">
            <SelectItem value="per_part">Per SMS Part</SelectItem>
            <SelectItem value="per_char_block">Per Character Block</SelectItem>
            <SelectItem value="per_character">Per Individual Character</SelectItem>
            <SelectItem value="per_sms">Per SMS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rule.mode === 'per_part' && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Per SMS Part Pricing</h3>
          <NumberField
            label="Price per SMS segment (KES)"
            value={rule.pricePerPart}
            onChange={(value) => onChange({ ...rule, pricePerPart: value })}
            step="0.01"
          />
          <Separator />
          <p className="text-xs font-medium text-slate-700 uppercase tracking-wide">GSM-7 (standard text)</p>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Characters per first part"
              value={rule.gsm7Part1 ?? 160}
              onChange={(value) => onChange({ ...rule, gsm7Part1: value })}
            />
            <NumberField
              label="Characters per additional part"
              value={rule.gsm7PartN ?? 153}
              onChange={(value) => onChange({ ...rule, gsm7PartN: value })}
            />
          </div>
          <p className="text-xs font-medium text-slate-700 uppercase tracking-wide">Unicode / emoji — UCS-2</p>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Characters per first part"
              value={rule.ucs2Part1 ?? 70}
              onChange={(value) => onChange({ ...rule, ucs2Part1: value })}
            />
            <NumberField
              label="Characters per additional part"
              value={rule.ucs2PartN ?? 67}
              onChange={(value) => onChange({ ...rule, ucs2PartN: value })}
            />
          </div>
        </div>
      )}

      {rule.mode === 'per_char_block' && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Per Character Block Billing</h3>
          <p className="text-xs text-slate-500">
            Custom billing unit independent of provider SMS segmentation. Charge = CEILING(characters ÷ block size) × price per block.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="Characters per billing block"
              value={rule.charsPerBlock ?? 160}
              onChange={(value) => onChange({ ...rule, charsPerBlock: value })}
            />
            <NumberField
              label="Price per billing block (KES)"
              value={rule.pricePerBlock}
              onChange={(value) => onChange({ ...rule, pricePerBlock: value })}
              step="0.01"
            />
          </div>
          <CheckboxField
            label="Use same price for GSM-7 and Unicode"
            checked={rule.samePriceForEncodings !== false}
            onChange={(checked) => onChange({ ...rule, samePriceForEncodings: checked })}
          />
          {rule.samePriceForEncodings === false && (
            <div className="grid grid-cols-2 gap-4">
              <NumberField
                label="Unicode characters per block"
                value={rule.ucs2CharsPerBlock ?? 70}
                onChange={(value) => onChange({ ...rule, ucs2CharsPerBlock: value })}
              />
              <NumberField
                label="Unicode price per block (KES)"
                value={rule.ucs2PricePerBlock}
                onChange={(value) => onChange({ ...rule, ucs2PricePerBlock: value })}
                step="0.01"
              />
            </div>
          )}
          <CheckboxField
            label="Charge partial blocks as a full block (round up)"
            checked={rule.roundPartialBlocks !== false}
            onChange={(checked) => onChange({ ...rule, roundPartialBlocks: checked })}
          />
          <NumberField
            label="Minimum charge per message (KES)"
            value={rule.minimumChargePerMessage}
            onChange={(value) => onChange({ ...rule, minimumChargePerMessage: value })}
            step="0.01"
          />
          <Separator />
          <p className="text-xs font-medium text-slate-700 uppercase tracking-wide">Provider SMS segmentation (reference)</p>
          <div className="grid grid-cols-2 gap-4">
            <NumberField label="GSM-7 first part" value={rule.gsm7Part1 ?? 160} onChange={(v) => onChange({ ...rule, gsm7Part1: v })} />
            <NumberField label="GSM-7 additional parts" value={rule.gsm7PartN ?? 153} onChange={(v) => onChange({ ...rule, gsm7PartN: v })} />
            <NumberField label="UCS-2 first part" value={rule.ucs2Part1 ?? 70} onChange={(v) => onChange({ ...rule, ucs2Part1: v })} />
            <NumberField label="UCS-2 additional parts" value={rule.ucs2PartN ?? 67} onChange={(v) => onChange({ ...rule, ucs2PartN: v })} />
          </div>
        </div>
      )}

      {rule.mode === 'per_character' && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Per Individual Character</h3>
          <NumberField
            label="Price per character (KES)"
            value={rule.pricePerCharacter}
            onChange={(value) => onChange({ ...rule, pricePerCharacter: value })}
            step="0.001"
          />
          <CheckboxField
            label="Use same price for GSM-7 and Unicode"
            checked={rule.samePriceForEncodings !== false}
            onChange={(checked) => onChange({ ...rule, samePriceForEncodings: checked })}
          />
          {rule.samePriceForEncodings === false && (
            <NumberField
              label="Unicode price per character (KES)"
              value={rule.ucs2PricePerCharacter}
              onChange={(value) => onChange({ ...rule, ucs2PricePerCharacter: value })}
              step="0.001"
            />
          )}
          <NumberField
            label="Minimum charge per message (KES)"
            value={rule.minimumChargePerMessage}
            onChange={(value) => onChange({ ...rule, minimumChargePerMessage: value })}
            step="0.01"
          />
        </div>
      )}

      {rule.mode === 'per_sms' && (
        <NumberField
          label="Price per SMS (KES)"
          value={rule.pricePerSms}
          onChange={(value) => onChange({ ...rule, pricePerSms: value })}
          step="0.01"
        />
      )}

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-emerald-900">Live Preview — {getModeLabel(rule.mode)}</p>
        {rule.mode === 'per_char_block' && blockSamples.length > 0 && (
          <div className="space-y-1">
            {blockSamples.map((sample) => (
              <div key={sample.range} className="flex justify-between text-sm">
                <span className="text-emerald-800">{sample.range}</span>
                <span className="font-medium text-emerald-900">KSh {sample.charge.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between text-sm border-t border-emerald-200 pt-2">
          <span className="text-emerald-800">250-character sample message</span>
          <span className="font-semibold text-emerald-900">KSh {preview.charge.toFixed(2)}</span>
        </div>
        <p className="text-xs text-emerald-700">
          Provider SMS parts for sample: {preview.smsParts}
          {preview.billingBlocks != null ? ` · Billing blocks: ${preview.billingBlocks}` : ''}
        </p>
      </div>

      <div className="flex items-center gap-6 pt-2 border-t border-slate-200">
        <CheckboxField
          label="Charge for failed SMS"
          checked={rule.chargeFailed || false}
          onChange={(checked) => onChange({ ...rule, chargeFailed: checked })}
        />
        <CheckboxField
          label="Refund on failure"
          checked={rule.refundOnFail !== false}
          onChange={(checked) => onChange({ ...rule, refundOnFail: checked })}
        />
      </div>

      <div className="flex gap-3 pt-2 border-t border-slate-200">
        <Button
          onClick={onSave}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Rule
        </Button>
        <Button variant="outline" onClick={onCancel} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl">
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function PricingRuleEditorDialog({
  rule,
  title,
  description,
  open,
  onOpenChange,
  onChange,
  onSave,
}: {
  rule: EditablePricingRule
  title: string
  description?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (rule: EditablePricingRule) => void
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/40 backdrop-blur-sm"
        className="max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-xl p-8"
      >
        <DialogHeader className="pb-5 border-b border-slate-200">
          <DialogTitle className="text-xl font-semibold text-slate-900">{title}</DialogTitle>
          {description && <DialogDescription className="text-slate-500 text-sm mt-1.5">{description}</DialogDescription>}
        </DialogHeader>
        <PricingRuleForm
          rule={rule}
          title={title}
          description={description}
          onChange={onChange}
          onSave={onSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

export function formatRulePriceLabel(rule: PricingRuleConfig): string {
  switch (rule.mode) {
    case 'per_char_block':
      return `KSh ${rule.pricePerBlock ?? 0} per ${rule.charsPerBlock ?? 160} chars`
    case 'per_character':
      return `KSh ${rule.pricePerCharacter ?? 0} per character`
    case 'per_sms':
      return `KSh ${rule.pricePerSms ?? 0} per SMS`
    default:
      return `KSh ${rule.pricePerPart ?? 0} per SMS segment`
  }
}

export function getDefaultPricingRule(scope: 'global' | 'user', userId?: string): EditablePricingRule {
  return {
    scope,
    userId,
    mode: 'per_char_block',
    charsPerBlock: 100,
    pricePerBlock: 0.3,
    gsm7Part1: 160,
    gsm7PartN: 153,
    ucs2Part1: 70,
    ucs2PartN: 67,
    samePriceForEncodings: true,
    roundPartialBlocks: true,
    chargeFailed: false,
    refundOnFail: true,
  }
}

export function copyGlobalRuleForOverride(globalRule: EditablePricingRule, userId: string): EditablePricingRule {
  return {
    ...globalRule,
    _id: undefined,
    scope: 'user',
    userId,
  }
}
