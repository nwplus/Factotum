import BaseCommand from "@/classes/BaseCommand";
import { VerificationDoc } from "@/types/db/verification";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import { Command, CommandOptionsRunTypeEnum } from "@sapphire/framework";
import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

@ApplyOptions<Command.Options>({
  name: "start-add-members",
  description: "Start prompt to add verified members.",
  runIn: CommandOptionsRunTypeEnum.GuildText,
  preconditions: ["AdminRoleOnly"],
})
class StartAddMembers extends BaseCommand {
  protected override setCommandOptions() {
    return {
      idHints: ["1396765715939463250"],
    };
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const guildId = interaction.guildId!;

    const guildDocRef = getGuildDocRef(guildId);
    const verificationDocRef = guildDocRef
      .collection("command-data")
      .doc("verification");

    const verificationDoc = await verificationDocRef.get();
    if (!verificationDoc.exists) {
      return interaction.reply({
        content:
          "Verification system is not initialized! Please run /start-verification first.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const verificationData = verificationDoc.data() as VerificationDoc;

    const defaultRoleIds = { ...verificationData.roleIds } as Record<
      string,
      string
    >;
    delete defaultRoleIds["hacker"];
    const roleOptions = [
      ...Object.keys(defaultRoleIds),
      ...Object.keys(verificationData.extraRoles),
    ].map((roleName) =>
      new StringSelectMenuOptionBuilder().setLabel(roleName).setValue(roleName),
    );

    if (roleOptions.length === 0) {
      return interaction.reply({
        content: "No roles are available for adding members!",
        flags: MessageFlags.Ephemeral,
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`add-members-select`)
      .setPlaceholder("Select a role type for the members")
      .addOptions(roleOptions);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu,
    );

    const embed = new EmbedBuilder()
      .setTitle("Add Verified Members")
      .setDescription(
        "Select the role type you want to assign to the new members. You'll then be prompted to enter their emails.",
      )
      .setColor("#0099ff");

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  }
}

export default StartAddMembers;
