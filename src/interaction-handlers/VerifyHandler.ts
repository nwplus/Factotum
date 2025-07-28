import { GuildDoc } from "@/types/db/guild";
import {
  HackersDoc,
  OtherAttendeesDoc,
  VerificationDoc,
} from "@/types/db/verification";
import { checkMemberRoles } from "@/util/discord";
import { getGuildDocRef, getHackathonDocRef } from "@/util/nwplus-firestore";

import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  ActionRowBuilder,
  type ButtonInteraction,
  GuildMember,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { DocumentReference, FieldValue } from "firebase-admin/firestore";

enum VerifyResult {
  SUCCESS = 0,
  FAILURE = 1,
  ALREADY_VERIFIED = 2,
}

interface VerifyHandlerProps {
  guildDocRef: DocumentReference;
  email: string;
  member: GuildMember;
}

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
class VerifyHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    const member = interaction.member as GuildMember;

    const guildDocRef = getGuildDocRef(interaction.guildId!);
    const guildDocData = (await guildDocRef.get()).data() as GuildDoc;
    if (!checkMemberRoles(member, [guildDocData.roleIds.unverified])) {
      return interaction.reply({
        content:
          "You are not eligible to be checked in! If you don't have correct access to the server, please contact an organizer.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("verifyModal")
      .setTitle("Verify")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("email")
            .setLabel("Email")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Email")
            .setRequired(true),
        ),
      );

    await interaction.showModal(modal);

    const submitted = await interaction.awaitModalSubmit({
      time: 300000,
      filter: (j) => j.user.id === interaction.user.id,
    });

    if (!submitted) {
      return interaction.reply({
        content: "You did not submit the modal in time.",
        flags: [MessageFlags.Ephemeral],
      });
    }

    await submitted.deferReply({ flags: [MessageFlags.Ephemeral] });

    await this.handleVerify(
      submitted,
      [this.verifyHacker, this.verifyOtherRole],
      {
        guildDocRef,
        email: submitted.fields.getTextInputValue("email"),
        member,
      },
    );
  }

  /**
   * Returns early for success and already verified cases.
   * If failure, keeps trying all handlers until the last one
   */
  private async handleVerify(
    interaction: ModalSubmitInteraction,
    verificationHandlers: ((
      props: VerifyHandlerProps,
    ) => Promise<VerifyResult>)[],
    props: VerifyHandlerProps,
  ) {
    for (let i = 0; i < verificationHandlers.length; i++) {
      const result = await verificationHandlers[i](props);
      switch (result) {
        case VerifyResult.FAILURE:
          if (i < verificationHandlers.length - 1) continue;
          await interaction.followUp({
            content:
              "Unable to verify your email. Please make sure you are using the same email you used to apply. If you are still having trouble verifying, please use the check-in support channel to contact an organizer.",
          });
          break;
        case VerifyResult.ALREADY_VERIFIED:
          await interaction.followUp({
            content:
              "You have already been verified! If you are having trouble seeing any channels, please use the check-in support channel to contact an organizer.",
            flags: [MessageFlags.Ephemeral],
          });
          return;
        case VerifyResult.SUCCESS:
        default:
          await interaction.followUp({
            content:
              "Successfully verified! If you are still unable to see any channels, please use the check-in support channel to contact an organizer.",
            flags: [MessageFlags.Ephemeral],
          });
          return;
      }
    }
  }

  private async verifyHacker({
    guildDocRef,
    email,
    member,
  }: VerifyHandlerProps) {
    const guildDocData = (await guildDocRef.get()).data() as GuildDoc;
    const hackathonDocRef = getHackathonDocRef(guildDocData.hackathonName);
    const hackerDoc = await hackathonDocRef
      .collection("Applicants")
      .where("basicInfo.email", "==", email)
      .where("status.applicationStatus", "==", "acceptedAndAttending")
      .limit(1)
      .get();
    if (hackerDoc.empty) return VerifyResult.FAILURE;

    const verificationDocRef = guildDocRef
      .collection("command-data")
      .doc("verification");

    const existingHackerDocByHackerIdRef = verificationDocRef
      .collection("hackers")
      .doc(hackerDoc.docs[0].id);

    const existingHackerDocByDiscordIdRef = verificationDocRef
      .collection("hackers")
      .where("discordId", "==", member.user.id);

    if (
      (await existingHackerDocByHackerIdRef.get()).exists ||
      !(await existingHackerDocByDiscordIdRef.get()).empty
    ) {
      return VerifyResult.ALREADY_VERIFIED;
    }

    await verificationDocRef
      .collection("hackers")
      .doc(hackerDoc.docs[0].id)
      .set({
        discordId: member.user.id,
        verifiedTimestamp: FieldValue.serverTimestamp(),
      } as HackersDoc);

    const verificationDocData = (
      await verificationDocRef.get()
    ).data() as VerificationDoc;
    await member.roles.remove(guildDocData.roleIds.unverified);
    await member.roles.add([
      guildDocData.roleIds.verified,
      verificationDocData.roleIds.hacker,
    ]);
    return VerifyResult.SUCCESS;
  }

  private async verifyOtherRole({
    guildDocRef,
    email,
    member,
  }: VerifyHandlerProps) {
    const verificationDocRef = guildDocRef
      .collection("command-data")
      .doc("verification");
    const otherRoleDoc = await verificationDocRef
      .collection("other-attendees")
      .where("email", "==", email)
      .limit(1)
      .get();
    if (otherRoleDoc.empty) return VerifyResult.FAILURE;

    const existingDocByDiscordIdRef = verificationDocRef
      .collection("other-attendees")
      .where("discordId", "==", member.user.id);

    if (
      otherRoleDoc.docs[0].get("discordId") ||
      !(await existingDocByDiscordIdRef.get()).empty
    ) {
      return VerifyResult.ALREADY_VERIFIED;
    }

    await otherRoleDoc.docs[0].ref.update({
      discordId: member.user.id,
      verifiedTimestamp: FieldValue.serverTimestamp(),
    } as Partial<OtherAttendeesDoc>);

    const guildDocData = (await guildDocRef.get()).data() as GuildDoc;
    const verificationDocData = (
      await verificationDocRef.get()
    ).data() as VerificationDoc;

    await member.roles.remove(guildDocData.roleIds.unverified);
    await member.roles.add([
      guildDocData.roleIds.verified,
      ...(otherRoleDoc.docs[0].get("roles") as string[]).map(
        (roleName) =>
          // @ts-expect-error already accounting for if roleName is not indexable in roleIds
          verificationDocData.roleIds[roleName] ??
          verificationDocData.extraRoles[roleName],
      ),
    ]);
    return VerifyResult.SUCCESS;
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== "verify") return this.none();
    return this.some();
  }
}

export default VerifyHandler;
