import StartOrganizerCheckIn from "@/commands/StartOrganizerCheckIn";
import { GuildDoc } from "@/types/db/guild";
import { OrganizerCheckInDoc } from "@/types/db/organizer-check-in";
import { checkMemberRoles } from "@/util/discord";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { type ButtonInteraction, MessageFlags } from "discord.js";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
class CheckInOutHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    const guild = interaction.guild!;
    const member = guild.members.cache.get(interaction.user.id)!;

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    // Get guild data to check roles
    const guildDocRef = getGuildDocRef(guild.id);
    const guildDoc = await guildDocRef.get();
    const guildData = guildDoc.data() as GuildDoc;

    // Check if user has admin or staff role
    if (
      !checkMemberRoles(member, [
        guildData.roleIds.admin,
        guildData.roleIds.staff,
      ])
    ) {
      return interaction.reply({
        content: "You do not have permissions to use this command!",
        flags: [MessageFlags.Ephemeral],
      });
    }

    // Get organizer check-in data
    const organizerCheckInDocRef = guildDocRef
      .collection("command-data")
      .doc("organizer-check-in");

    const organizerCheckInDoc = await organizerCheckInDocRef.get();
    if (!organizerCheckInDoc.exists) {
      return interaction.reply({
        content: "Organizer check-in system not initialized!",
        flags: [MessageFlags.Ephemeral],
      });
    }

    const organizerCheckInData =
      organizerCheckInDoc.data() as OrganizerCheckInDoc;

    const updatedAttendance = {
      ...organizerCheckInData.organizerAttendance,
    };

    const isCheckIn = interaction.customId === "organizer-check-in";

    if (isCheckIn) {
      updatedAttendance[member.user.username] = member.displayName;
    } else {
      delete updatedAttendance[member.user.username];
    }

    // Update Firestore
    await organizerCheckInDocRef.update({
      organizerAttendance: updatedAttendance,
    });

    // Update the message embed
    const updatedEmbed =
      StartOrganizerCheckIn.generateAttendanceEmbed(updatedAttendance);
    await interaction.message.edit({ embeds: [updatedEmbed] });

    await interaction.followUp({
      content: isCheckIn
        ? `Checked in ${member.displayName}. Remember to check out when you leave the venue!`
        : `Checked out ${member.displayName}. Please come back soon 🥹`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (
      !["organizer-check-in", "organizer-check-out"].includes(
        interaction.customId,
      )
    )
      return this.none();
    return this.some();
  }
}

export default CheckInOutHandler;
