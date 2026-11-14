import "dotenv/config";
import {
  Client, GatewayIntentBits, Events, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} from "discord.js";
import { LavalinkManager } from "lavalink-client";

const required = ["DISCORD_TOKEN", "CLIENT_ID", "LAVALINK_HOST", "LAVALINK_PASSWORD"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const GOLD = 0xD4AF37;
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

client.lavalink = new LavalinkManager({
  nodes: [{
    id: "TOP-NODE",
    host: process.env.LAVALINK_HOST,
    port: Number(process.env.LAVALINK_PORT || 2333),
    authorization: process.env.LAVALINK_PASSWORD,
    secure: false
  }],
  sendToShard: (guildId, payload) =>
    client.guilds.cache.get(guildId)?.shard?.send(payload),
  client: { id: process.env.CLIENT_ID, username: "TOP MUSIC" },
  autoSkip: true,
  playerOptions: {
    defaultSearchPlatform: process.env.SEARCH_PLATFORM || "ytsearch",
    clientBasedPositionUpdateInterval: 1000,
    volumeDecrementer: 1,
    onDisconnect: { autoReconnect: true, destroyPlayer: false },
    onEmptyQueue: { destroyAfterMs: 60_000 }
  },
  queueOptions: { maxPreviousTracks: 25 }
});

const brandEmbed = (description, title = "TOP MUSIC") =>
  new EmbedBuilder().setColor(GOLD).setTitle(`◆ ${title} ◆`)
    .setDescription(description)
    .setFooter({ text: "TOP MUSIC • PREMIUM SOUND" })
    .setTimestamp();

function getVoice(interaction) {
  return interaction.member?.voice?.channel ?? null;
}
function getPlayer(guildId) {
  return client.lavalink.getPlayer(guildId);
}
function sameVoice(interaction, player) {
  const voice = getVoice(interaction);
  return voice && player?.voiceChannelId === voice.id;
}
function trackName(track) {
  return track?.info?.title || "Unknown track";
}
function makeControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("top_pause").setLabel("إيقاف مؤقت").setEmoji("⏸️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("top_resume").setLabel("استكمال").setEmoji("▶️").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("top_skip").setLabel("تخطي").setEmoji("⏭️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("top_stop").setLabel("إيقاف").setEmoji("⏹️").setStyle(ButtonStyle.Danger)
  );
}

client.on("raw", data => client.lavalink.sendRawData(data));

client.once(Events.ClientReady, async readyClient => {
  console.log(`TOP MUSIC logged in as ${readyClient.user.tag}`);
  try {
    await client.lavalink.init({ id: readyClient.user.id, username: readyClient.user.username });
    console.log("Lavalink manager initialized.");
  } catch (error) {
    console.error("Lavalink initialization error:", error);
  }
});

client.lavalink.on("trackStart", (player, track) => {
  const channel = client.channels.cache.get(player.textChannelId);
  if (channel?.isTextBased()) {
    channel.send({
      embeds: [brandEmbed(`🎶 **${trackName(track)}**`, "NOW PLAYING")],
      components: [makeControls()]
    }).catch(() => {});
  }
});
client.lavalink.on("queueEnd", player => {
  const channel = client.channels.cache.get(player.textChannelId);
  if (channel?.isTextBased()) channel.send({ embeds: [brandEmbed("انتهت قائمة التشغيل. أضف أغنية جديدة باستخدام `/play`.")] }).catch(() => {});
});
client.lavalink.on("trackError", (player, track, payload) => {
  console.error("Track error:", track?.info?.title, payload?.exception?.message || payload);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {
    if (!interaction.customId.startsWith("top_")) return;
    const player = getPlayer(interaction.guildId);
    if (!player) return interaction.reply({ content: "مفيش مشغل شغال حالياً.", ephemeral: true });
    if (!sameVoice(interaction, player)) {
      return interaction.reply({ content: "ادخل نفس الروم الصوتي اللي فيه البوت الأول.", ephemeral: true });
    }
    try {
      if (interaction.customId === "top_pause") await player.pause();
      if (interaction.customId === "top_resume") await player.resume();
      if (interaction.customId === "top_skip") await player.skip();
      if (interaction.customId === "top_stop") {
        await player.destroy();
        return interaction.update({ embeds: [brandEmbed("تم إيقاف التشغيل وإخراج البوت من الروم.")], components: [] });
      }
      return interaction.reply({ content: "تم تنفيذ الأمر.", ephemeral: true });
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: "حصل خطأ أثناء تنفيذ الأمر.", ephemeral: true }).catch(() => {});
    }
  }

  if (!interaction.isChatInputCommand()) return;
  const command = interaction.commandName;
  try {
    if (command === "help") {
      return interaction.reply({
        embeds: [brandEmbed(
          "`/play song` تشغيل أو إضافة أغنية\n`/pause` إيقاف مؤقت\n`/resume` استكمال\n`/skip` تخطي\n`/stop` إيقاف ومسح القائمة\n`/queue` عرض القائمة\n`/nowplaying` الأغنية الحالية\n`/volume 50` مستوى الصوت\n`/loop off|track|queue` التكرار\n`/shuffle` خلط القائمة\n`/remove 2` حذف عنصر\n`/clear` مسح المنتظر\n`/join` دخول الروم\n`/leave` خروج",
          "COMMANDS"
        )]
      });
    }

    if (command === "join") {
      const voice = getVoice(interaction);
      if (!voice) return interaction.reply({ content: "ادخل روم صوتي الأول.", ephemeral: true });
      let player = getPlayer(interaction.guildId);
      if (!player) player = await client.lavalink.createPlayer({
        guildId: interaction.guildId, voiceChannelId: voice.id,
        textChannelId: interaction.channelId, selfDeaf: true, volume: 70
      });
      await player.connect();
      return interaction.reply({ embeds: [brandEmbed(`دخلت روم **${voice.name}** بنجاح.`)] });
    }

    if (command === "play") {
      const voice = getVoice(interaction);
      if (!voice) return interaction.reply({ content: "لازم تدخل روم صوتي الأول.", ephemeral: true });
      await interaction.deferReply();
      let player = getPlayer(interaction.guildId);
      if (player && player.voiceChannelId !== voice.id) {
        return interaction.editReply("البوت موجود في روم صوتي تاني.");
      }
      if (!player) player = await client.lavalink.createPlayer({
        guildId: interaction.guildId, voiceChannelId: voice.id,
        textChannelId: interaction.channelId, selfDeaf: true, volume: 70
      });
      await player.connect();
      const query = interaction.options.getString("song", true);
      const result = await player.search({ query }, interaction.user);
      if (!result?.tracks?.length) return interaction.editReply("ملقتش نتائج. جرّب اسم أغنية تاني أو رابط من مصدر مدعوم.");
      if (result.loadType === "error") return interaction.editReply("مصدر الأغنية رجّع خطأ. جرّب رابط أو مصدر تاني.");
      const tracks = result.tracks;
      await player.queue.add(tracks[0]);
      if (!player.playing) await player.play();
      const msg = tracks.length > 1
        ? `تمت إضافة **${trackName(tracks[0])}** للقائمة. (${tracks.length} نتيجة متاحة، أضفت أول نتيجة)`
        : `تمت إضافة **${trackName(tracks[0])}** للقائمة.`;
      return interaction.editReply({ embeds: [brandEmbed(msg, "ADDED TO QUEUE")] });
    }

    const player = getPlayer(interaction.guildId);
    if (!player && !["leave"].includes(command)) {
      return interaction.reply({ content: "مفيش أغاني شغالة. استخدم `/play` الأول.", ephemeral: true });
    }

    if (["pause", "resume", "skip", "stop", "volume", "shuffle", "loop", "remove", "clear", "queue", "nowplaying", "leave"].includes(command)) {
      if (command !== "leave" && !sameVoice(interaction, player)) {
        return interaction.reply({ content: "لازم تكون في نفس الروم الصوتي مع البوت.", ephemeral: true });
      }
    }

    switch (command) {
      case "pause":
        await player.pause();
        return interaction.reply({ embeds: [brandEmbed("تم إيقاف الأغنية مؤقتاً.")] });
      case "resume":
        await player.resume();
        return interaction.reply({ embeds: [brandEmbed("رجعنا نشغّل الموسيقى.")] });
      case "skip":
        await player.skip();
        return interaction.reply({ embeds: [brandEmbed("تم تخطي الأغنية.")] });
      case "stop":
        await player.destroy();
        return interaction.reply({ embeds: [brandEmbed("تم إيقاف التشغيل ومسح المشغل.")] });
      case "leave":
        if (player) await player.destroy();
        return interaction.reply({ embeds: [brandEmbed("خرجت من الروم الصوتي.")] });
      case "volume": {
        const level = interaction.options.getInteger("level", true);
        await player.setVolume(level);
        return interaction.reply({ embeds: [brandEmbed(`مستوى الصوت بقى **${level}%**.`)] });
      }
      case "shuffle":
        player.queue.shuffle();
        return interaction.reply({ embeds: [brandEmbed("تم خلط قائمة التشغيل.")] });
      case "loop": {
        const mode = interaction.options.getString("mode", true);
        const repeat = { off: "off", track: "track", queue: "queue" }[mode];
        await player.setRepeatMode(repeat);
        return interaction.reply({ embeds: [brandEmbed(`وضع التكرار: **${mode}**`)] });
      }
      case "remove": {
        const position = interaction.options.getInteger("position", true) - 1;
        const removed = player.queue.tracks[position];
        if (!removed) return interaction.reply({ content: "رقم الأغنية مش موجود في القائمة.", ephemeral: true });
        await player.queue.remove(position);
        return interaction.reply({ embeds: [brandEmbed(`تم حذف **${trackName(removed)}**.`)] });
      }
      case "clear":
        player.queue.clear();
        return interaction.reply({ embeds: [brandEmbed("تم مسح الأغاني المنتظرة.")] });
      case "queue": {
        const tracks = player.queue.tracks.slice(0, 10);
        const lines = tracks.length
          ? tracks.map((t, i) => `**${i + 1}.** ${trackName(t)}`).join("\n")
          : "مفيش أغاني منتظرة.";
        return interaction.reply({ embeds: [brandEmbed(`**دلوقتي:** ${trackName(player.queue.current)}\n\n${lines}`, "QUEUE")] });
      }
      case "nowplaying": {
        const current = player.queue.current;
        if (!current) return interaction.reply({ content: "مفيش أغنية شغالة حالياً.", ephemeral: true });
        return interaction.reply({
          embeds: [brandEmbed(`🎵 **${trackName(current)}**\nالمصدر: ${current.info?.sourceName || "غير معروف"}`, "NOW PLAYING")],
          components: [makeControls()]
        });
      }
    }
  } catch (error) {
    console.error(`Command /${command} failed:`, error);
    const message = "حصل خطأ. راجع إعدادات Lavalink والـ logs، وجرب تاني.";
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    }
  }
});

client.on(Events.Error, console.error);
process.on("unhandledRejection", error => console.error("Unhandled rejection:", error));
client.login(process.env.DISCORD_TOKEN);
