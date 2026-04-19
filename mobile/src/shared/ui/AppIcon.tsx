import { memo } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

type AppIconName =
  | "home"
  | "transactions"
  | "budgets"
  | "categories"
  | "accounts"
  | "more"
  | "support"
  | "settings"
  | "subscriptions";

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const DEFAULT_SIZE = 20;

export const AppIcon = memo(({ name, size = DEFAULT_SIZE, color = "#0f766e", strokeWidth = 1.9 }: AppIconProps) => {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  switch (name) {
    case "home":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 10.8 12 3l9 7.8" {...common} />
          <Path d="M5.8 9.8V21h12.4V9.8" {...common} />
          <Path d="M10 21v-5.2h4V21" {...common} />
        </Svg>
      );
    case "transactions":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 7h13" {...common} />
          <Path d="m14 4 3 3-3 3" {...common} />
          <Path d="M20 17H7" {...common} />
          <Path d="m10 14-3 3 3 3" {...common} />
        </Svg>
      );
    case "budgets":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 3a9 9 0 1 0 9 9" {...common} />
          <Path d="M12 3v9h9" {...common} />
          <Path d="M12 12 7.5 19" {...common} />
        </Svg>
      );
    case "categories":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3" y="3" width="8" height="8" rx="1.6" {...common} />
          <Rect x="13" y="3" width="8" height="8" rx="1.6" {...common} />
          <Rect x="3" y="13" width="8" height="8" rx="1.6" {...common} />
          <Rect x="13" y="13" width="8" height="8" rx="1.6" {...common} />
        </Svg>
      );
    case "accounts":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="2.8" y="6.5" width="18.4" height="11" rx="2.6" {...common} />
          <Path d="M17 11.4h4.2V16H17a2.3 2.3 0 0 1 0-4.6Z" {...common} />
          <Circle cx="17.6" cy="13.7" r="0.7" fill={color} />
        </Svg>
      );
    case "more":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="6" cy="12" r="1.8" fill={color} />
          <Circle cx="12" cy="12" r="1.8" fill={color} />
          <Circle cx="18" cy="12" r="1.8" fill={color} />
        </Svg>
      );
    case "support":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" {...common} />
          <Path d="M9.4 9.2a2.7 2.7 0 1 1 4.7 1.8c-.9.8-1.6 1.3-1.6 2.4" {...common} />
          <Circle cx="12" cy="17" r="0.9" fill={color} />
        </Svg>
      );
    case "settings":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="3.2" {...common} />
          <Path d="M19.4 14.3 21 13l-1-2.2-2-.2a6.9 6.9 0 0 0-.7-1.5l1.1-1.7-1.7-1.7-1.7 1.1a6.9 6.9 0 0 0-1.5-.7l-.2-2-2.2-1-1.3 1.6-1.3-1.6-2.2 1-.2 2c-.5.2-1 .4-1.5.7L5.3 5.7 3.6 7.4l1.1 1.7c-.3.5-.5 1-.7 1.5l-2 .2-1 2.2 1.6 1.3-1.6 1.3 1 2.2 2 .2c.2.5.4 1 .7 1.5l-1.1 1.7 1.7 1.7 1.7-1.1c.5.3 1 .5 1.5.7l.2 2 2.2 1 1.3-1.6 1.3 1.6 2.2-1 .2-2c.5-.2 1-.4 1.5-.7l1.7 1.1 1.7-1.7-1.1-1.7c.3-.5.5-1 .7-1.5l2-.2 1-2.2-1.6-1.3Z" {...common} />
        </Svg>
      );
    case "subscriptions":
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="2.8" y="5.6" width="18.4" height="12.8" rx="2.3" {...common} />
          <Path d="M2.8 10h18.4" {...common} />
          <Path d="M6.5 14.2h4.2" {...common} />
          <Path d="M13 14.2h4.2" {...common} />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" {...common} />
        </Svg>
      );
  }
});

AppIcon.displayName = "AppIcon";
