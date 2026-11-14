import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

export const commands = [
  new SlashCommandBuilder().setName("play").setDescription("شغّل أغنية أو أضفها للقائمة")
    .addStringOption(o => o.setName("song").setDescription("اسم الأغنية أو رابط مسموح").setRequired(true)),
  new SlashCommandBuilder().setName("pause").setDescription("إيقاف مؤقت"),
  new SlashCommandBuilder().setName("resume").setDescription("استكمال التشغيل"),
  new SlashCommandBuilder().setName("skip").setDescription("تخطي الأغنية الحالية"),
  new SlashCommandBuilder().setName("stop").setDescription("إيقاف الموسيقى ومسح القائمة"),
  new SlashCommandBuilder().setName("leave").setDescription("إخراج البوت من الروم الصوتي"),
  new SlashCommandBuilder().setName("join").setDescription("دخول رومك الصوتي"),
  new SlashCommandBuilder().setName("queue").setDescription("عرض قائمة التشغيل"),
  new SlashCommandBuilder().setName("nowplaying").setDescription("عرض الأغنية الحالية وأزرار التحكم"),
  new SlashCommandBuilder().setName("volume").setDescription("تغيير مستوى الصوت")
    .addIntegerOption(o => o.setName("level").setDescription("من 1 إلى 100").setMinValue(1).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder().setName("shuffle").setDescription("خلط قائمة التشغيل"),
  new SlashCommandBuilder().setName("loop").setDescription("تغيير وضع التكرار")
    .addStringOption(o => o.setName("mode").setDescription("وضع التكرار").setRequired(true)
      .addChoices(
        { name: "إيقاف", value: "off" },
        { name: "الأغنية الحالية", value: "track" },
        { name: "القائمة", value: "queue" }
      )),
  new SlashCommandBuilder().setName("remove").setDescription("حذف أغنية من القائمة")
    .addIntegerOption(o => o.setName("position").setDescription("رقم الأغنية في القائمة").setMinValue(1).setRequired(true)),
  new SlashCommandBuilder().setName("clear").setDescription("مسح الأغاني المنتظرة"),
  new SlashCommandBuilder().setName("help").setDescription("عرض أوامر TOP MUSIC")
].map(c => c.toJSON());
