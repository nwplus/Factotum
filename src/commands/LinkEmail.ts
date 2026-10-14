import BaseCommand from "@/classes/BaseCommand";
import { idHints } from "@/constants/id-hints";
import { GuildDoc } from "@/types/db/guild";
import { OrganizerMappingDoc } from "@/types/db/organizer-mapping";
import { checkMemberRoles } from "@/util/discord";
import {
  getGuildDocRef,
  getOrganizerMappingDocRef,
} from "@/util/nwplus-firestore";
import { normalizeEmail } from "@/util/organizer-mappings";

import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { Timestamp } from "firebase-admin/firestore";

// Also excludes '/' and caps length: the email becomes a Firestore doc ID,
// which rejects path separators and IDs over 1500 bytes.
const EMAIL_REGEX = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;
const MAX_EMAIL_LENGTH = 320;

/**
 * Links an email from the Notion shift schedule to a Discord account so shift
 * reminders can mention the right person. Everything is ephemeral — mappings
 * pair members with (often personal) emails, which must never be shown
 * publicly.
 */
@ApplyOptions<Command.Options>({
  name: "link-email",
  description:
    "Link the email on your Notion shifts to your Discord account for shift reminders.",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["OrganizerRoleOnly"],
})
class LinkEmail extends BaseCommand {
  protected override buildCommand(builder: SlashCommandBuilder) {
    return builder
      .addStringOption((option) =>
        option
          .setName("email")
          .setDescription(
            "The email on your shifts in Notion (personal emails are fine)",
          )
          .setRequired(true),
      )
      .addUserOption((option) =>
        option
          .setName("user")
          .setDescription(
            "Link the email to this member instead (admins and staff only)",
          ),
      );
  }

  protected override setCommandOptions() {
    return {
      idHints: [idHints.linkEmail],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const email = normalizeEmail(interaction.options.getString("email", true));
    const targetUser = interaction.options.getUser("user", false);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!EMAIL_REGEX.test(email) || email.length > MAX_EMAIL_LENGTH) {
      return interaction.editReply(
        "That doesn't look like a valid email address.",
      );
    }

    const guildDocData = (
      await getGuildDocRef(interaction.guildId!).get()
    ).data() as GuildDoc;
    const isAdminOrStaff = checkMemberRoles(interaction.member!, [
      guildDocData.roleIds.admin,
      guildDocData.roleIds.staff,
    ]);
    if (targetUser && !isAdminOrStaff) {
      return interaction.editReply(
        "Only admins and staff can link an email for someone else.",
      );
    }
    const target = targetUser ?? interaction.user;

    const mappingDocRef = getOrganizerMappingDocRef(email);
    const existing = (await mappingDocRef.get()).data() as
      | OrganizerMappingDoc
      | undefined;
    // Don't reveal whose it is — that would leak another member's email link.
    if (existing && existing.discordUserId !== target.id && !isAdminOrStaff) {
      return interaction.editReply(
        "That email is already linked to a different Discord account. Ask an admin to re-link it.",
      );
    }

    await mappingDocRef.set({
      email,
      discordUserId: target.id,
      linkedAt: Timestamp.now(),
    } satisfies OrganizerMappingDoc);

    return interaction.editReply(
      `Linked ${email} to ${target}. Shift reminders will now mention ${targetUser ? "them" : "you"}.`,
    );
  }
}

export default LinkEmail;
