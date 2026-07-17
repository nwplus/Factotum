import { GuildDoc } from "@/types/db/guild";
import { VerificationDoc } from "@/types/db/verification";
import { checkMemberRoles } from "@/util/discord";
import { getGuildDocRef } from "@/util/nwplus-firestore";

import { Precondition } from "@sapphire/framework";
import { ChatInputCommandInteraction } from "discord.js";

/**
 * A precondition that requires the user to have the organizer, admin, or staff
 * role to run the command. Also enforces that the command is run in a server.
 * The organizer role comes from the verification config, so before
 * /start-verification is run only admins and staff pass.
 */
class OrganizerRoleOnlyPrecondition extends Precondition {
  public override async chatInputRun(
    interaction: ChatInputCommandInteraction,
  ): Precondition.AsyncResult {
    if (!interaction.guildId) {
      return this.error({ message: "This command must be run in a server!" });
    }
    const guildDocRef = getGuildDocRef(interaction.guildId);
    const guildDoc = await guildDocRef.get();
    const data = guildDoc.data() as GuildDoc;
    if (!guildDoc.exists || !data?.setupComplete) {
      return this.error({
        message:
          "This server is not setup yet. Run /init-bot to setup the server.",
      });
    }

    const allowedRoles = [data.roleIds.admin, data.roleIds.staff];
    const verificationDoc = await guildDocRef
      .collection("command-data")
      .doc("verification")
      .get();
    const organizerRole = (
      verificationDoc.data() as VerificationDoc | undefined
    )?.roleIds?.organizer;
    if (organizerRole) allowedRoles.push(organizerRole);

    if (!checkMemberRoles(interaction.member!, allowedRoles)) {
      return this.error({
        message: "Only organizers, admins, and staff can use this command!",
      });
    }

    return this.ok();
  }
}

declare module "@sapphire/framework" {
  interface Preconditions {
    OrganizerRoleOnly: never;
  }
}

export default OrganizerRoleOnlyPrecondition;
