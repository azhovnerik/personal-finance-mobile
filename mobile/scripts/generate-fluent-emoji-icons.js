const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");

const repoRawBase = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main";
const outFile = path.resolve(process.cwd(), "src/features/categories/fluentEmojiSvgs.ts");

const iconAssets = {
  "__fallback.money_bag": "assets/Money bag/Flat/money_bag_flat.svg",
  "expense.groceries": "assets/Shopping cart/Flat/shopping_cart_flat.svg",
  "expense.restaurant": "assets/Fork and knife with plate/Flat/fork_and_knife_with_plate_flat.svg",
  "expense.coffee": "assets/Hot beverage/Flat/hot_beverage_flat.svg",
  "expense.transport": "assets/Bus/Flat/bus_flat.svg",
  "expense.taxi": "assets/Taxi/Flat/taxi_flat.svg",
  "expense.fuel": "assets/Fuel pump/Flat/fuel_pump_flat.svg",
  "expense.home": "assets/House/Flat/house_flat.svg",
  "expense.rent": "assets/Office building/Flat/office_building_flat.svg",
  "expense.utilities": "assets/Electric plug/Flat/electric_plug_flat.svg",
  "expense.internet_mobile": "assets/Mobile phone/Flat/mobile_phone_flat.svg",
  "expense.health": "assets/Hospital/Flat/hospital_flat.svg",
  "expense.pharmacy": "assets/Pill/Flat/pill_flat.svg",
  "expense.sport": "assets/Soccer ball/Flat/soccer_ball_flat.svg",
  "expense.clothes": "assets/T-shirt/Flat/t-shirt_flat.svg",
  "expense.shopping": "assets/Shopping bags/Flat/shopping_bags_flat.svg",
  "expense.entertainment": "assets/Video game/Flat/video_game_flat.svg",
  "expense.travel": "assets/Airplane/Flat/airplane_flat.svg",
  "expense.education": "assets/Graduation cap/Flat/graduation_cap_flat.svg",
  "expense.gifts": "assets/Wrapped gift/Flat/wrapped_gift_flat.svg",
  "expense.children": "assets/Children crossing/Flat/children_crossing_flat.svg",
  "expense.pets": "assets/Dog face/Flat/dog_face_flat.svg",
  "expense.subscriptions": "assets/Credit card/Flat/credit_card_flat.svg",
  "expense.insurance": "assets/Shield/Flat/shield_flat.svg",
  "expense.bank_fees": "assets/Bank/Flat/bank_flat.svg",
  "expense.debt_payment": "assets/Money with wings/Flat/money_with_wings_flat.svg",
  "expense.other": "assets/Red question mark/Flat/red_question_mark_flat.svg",
  "income.salary": "assets/Money bag/Flat/money_bag_flat.svg",
  "income.freelance": "assets/Laptop/Flat/laptop_flat.svg",
  "income.business": "assets/Briefcase/Flat/briefcase_flat.svg",
  "income.bonus": "assets/Party popper/Flat/party_popper_flat.svg",
  "income.gifts": "assets/Wrapped gift/Flat/wrapped_gift_flat.svg",
  "income.cashback": "assets/Counterclockwise arrows button/Flat/counterclockwise_arrows_button_flat.svg",
  "income.interest": "assets/Chart increasing/Flat/chart_increasing_flat.svg",
  "income.investments": "assets/Chart increasing with yen/Flat/chart_increasing_with_yen_flat.svg",
  "income.rent": "assets/House/Flat/house_flat.svg",
  "income.refund": "assets/Receipt/Flat/receipt_flat.svg",
  "income.sale": "assets/Label/Flat/label_flat.svg",
  "income.other": "assets/Coin/Flat/coin_flat.svg",
  "transfer.between_accounts": "assets/Left-right arrow/Flat/left-right_arrow_flat.svg",
  "transfer.to_savings": "assets/Money bag/Flat/money_bag_flat.svg",
  "transfer.from_savings": "assets/Money bag/Flat/money_bag_flat.svg",
  "adjustment.balance": "assets/Balance scale/Flat/balance_scale_flat.svg",
  "debt.lent": "assets/Handshake/Flat/handshake_flat.svg",
  "debt.returned": "assets/Money with wings/Flat/money_with_wings_flat.svg",
};

const fetchText = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          fetchText(response.headers.location).then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => resolve(body));
      })
      .on("error", reject);
  });

const cleanSvg = (svg) =>
  svg
    .replace(/<\?xml[^>]*>\s*/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

const generate = async () => {
  const entries = [];

  for (const [key, assetPath] of Object.entries(iconAssets)) {
    const url = `${repoRawBase}/${assetPath.split("/").map(encodeURIComponent).join("/")}`;
    const svg = cleanSvg(await fetchText(url));
    entries.push([key, svg]);
  }

  const content = `// Generated from microsoft/fluentui-emoji Flat SVG assets. Do not edit by hand.
// Source: https://github.com/microsoft/fluentui-emoji

export const FLUENT_EMOJI_SVGS: Record<string, string> = {
${entries.map(([key, svg]) => `  ${JSON.stringify(key)}: ${JSON.stringify(svg)},`).join("\n")}
};
`;

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content);
  console.log(`Generated ${entries.length} Fluent Emoji SVGs at ${outFile}`);
};

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
