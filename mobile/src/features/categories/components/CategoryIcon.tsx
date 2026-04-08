import { memo, useMemo } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";

import { FLUENT_EMOJI_SVGS } from "../fluentEmojiSvgs";
import { normalizeCategoryIcon } from "../categoryIcons";

type CategoryIconProps = {
  name?: string | null;
  size?: number;
  color?: string;
  fallbackName?: string;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_FALLBACK_ICON = "__fallback.money_bag";

const getDefaultFallbackIcon = (name?: string | null) => {
  const normalized = name?.trim();
  if (!normalized) {
    return DEFAULT_FALLBACK_ICON;
  }
  if (normalized?.startsWith("income.")) {
    return "income.other";
  }
  if (normalized?.startsWith("transfer.")) {
    return "transfer.between_accounts";
  }
  return DEFAULT_FALLBACK_ICON;
};

const getFluentEmojiSvg = (name?: string | null, fallbackName?: string) => {
  const defaultFallbackName = getDefaultFallbackIcon(name);
  const normalizedName = normalizeCategoryIcon(name) ?? fallbackName ?? defaultFallbackName;
  const normalizedFallbackName = normalizeCategoryIcon(fallbackName) ?? fallbackName ?? defaultFallbackName;

  return FLUENT_EMOJI_SVGS[normalizedName] ?? FLUENT_EMOJI_SVGS[normalizedFallbackName] ?? FLUENT_EMOJI_SVGS[defaultFallbackName] ?? null;
};

export const CategoryIcon = memo(({
  name,
  size = 20,
  fallbackName,
  style,
}: CategoryIconProps) => {
  const xml = useMemo(() => {
    return getFluentEmojiSvg(name, fallbackName);
  }, [fallbackName, name]);

  if (!xml) {
    return null;
  }

  return <SvgXml xml={xml} width={size} height={size} style={style} />;
});

CategoryIcon.displayName = "CategoryIcon";
