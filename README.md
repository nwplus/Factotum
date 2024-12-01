# Factotum The do-it-all Discord Bot!

Previously known as nwPlus Discord Bot, Factotum started as a Discord bot to support small and medium hackathons run on the Discord platform for free. Now it has become a fully customizable, feature rich bot to support any and all types of events over discord. 

## Set up the bot
At the moment, the bot is still in development, but IT CAN BE USED. Please email me at juapgarc@gmail.com or reach out to me on discord JPGarcia99#8803 to talk about using the bot in its current state! If you would like to test the bot that is also a possibility, just reach out!

```
npm install
npm run dev
```

## How does Factotum support hackathon teams and events?
Factotum brings a lot of features that would traditionally happen at in-person hacakthons all over the word to the Discord platform.

All features listed below are unique and requires an admin to start them. All features are highly customizable, from the emojis used to the text sent.

Most features rely on emoji reactions, custom emojis can be used as well!

### Mentor Ticket System (WIP)
The mentor ticket system or more generally the ticketing system of Factotum is an advanced ticketing system for a set of users to inquire by the use of tickets, and another set of users can respond to such tickets both via text or voice.

The ticket system supports general tickets as well as sub-topic tickets (more detailed tickets intended for only a sub-section of the support team). 

The system also has a opt-in/opt-out system for the support team to select what sub-topic they want to be a part of, and admins can always add sub-topics as they see the need for them.

When opening a ticket:
- Users can add other users (team members) to be part of the ticket
- Can select a general ticket or a sub-topic ticket
- Will need to write a short description of their problem
- Will receive a DM with the ticket information as soon as it is submitted

When a ticket is submitted:
- Support staff can see the ticket information (description, people involved, sub-topic)
- Can start the help process with a click of a button (a category with a voice and text channel is created)
- Other support staff can always join a ticket, even if someone else is already helping
- Support staff can leave the ticket at any time with the click of a button
- As soon as everyone leaves the ticket, the ticket category and channels are destroyed

Things to come:
- Automatic ticket trash collector, Discord has a 500 channel limit, it is imperative old tickets get destroyed or the server could reach the limit very fast

### Team Formation
Team formation is always a huge part of any hackathon, traditionally, staff hold team formation mini-events for hackers to try and form teams. However, with COVID-19 and the transition to discord, the bot brings two unique alternatives.

#### Team Formation Catalog
The team formation catalog system works by posting information of teams looking for members, or members looking for a team on a specific channel, and the letting users DM those teams or members they are interested on working with.

1. Team captain or user looking for a team start the process with a click of a button (emoji)
2. Bot DMs instructions and the user sends information via DM
3. Bot posts team or member information on the channel catalog (channel is view only!)
4. Users can read the available members or teams and DM the user who "posted" the information
5. As soon as a person finds a team or a member to join their team, they can eliminate their "post" with a click of a button

As an added incentive for people to reach out to others, when someone joins the system either as a team looking for members, or as a member looking for a team, they will get notified every time a new counterpart is posted. For example, a user looking for a team will be notified of every new team looking for a member. This stops when they remove their information post.

#### Team Formation Roulette (WIP)
Team formation roulette is a more direct approach to team formation. Users join the queue as solos or teams of up to three (currently hard capped to create groups of 4, will change later). As people join the bot tries to create groups of 4 as efficiently as possible.

As this feature is a WIP, more information will be added once its production is complete.

### Verify and Attend
Keeping your Discord server is very important, specially if your event is closed to only those hackers that were accepted. The bot gives you two useful commands to keep your server safe.

Members call ``!verify theiremail@gmail.com`` or ``!attend theiremail@gmail.com`` and if the email is found on a firestore db, then they "gain access" by receiving a higher permission role. Emails are always kept private, they are immediately removed from the channel.

We are working on changing how this works to use a local or free db, and make it easy for admins to add emails, possibly from Discord.

### Role selector
Roles are an integral part of a well functioning Discord server. Sometimes it is best to let users select the roles they want to have, the role selector lets you do that with ease.

Admins can start a role selector on any text channel. Admins can then add new roles to the role selector for users to use. As an admin you can select what emojis to use, what roles to give, and what text to put on the role selector message.

### Report
Keeping your server safe is always hard, specially if your server is very big. With the ``!report`` command, any users can report bad behavior anonymously via DM. The reports get sent to a Admin only text channel.

### Threads
Many hackathons are transitioning from Slack to Discord. The one thing we love about Slack is the thread functionality. Factotum brings this functionality to Discord! Users can ask questions with the ``!ask`` command and other users can the respond to the question by clicking an emoji.

### Clear Chat
Sometimes as an Admin you want to delete an entire text channel, well Factotum has a ``!clear-chat`` command that will delete 100 messages from the text channel. You can let the bot know if you want to keep any pinned messages.

### Channel Creation (WIP)
Channel creation gives users the ability to create private voice or text channels for them to use with their team or group of friends. With a click of a button, the bot starts asking the user questions about what type of channel they want, the name of the channel, and who has access to this channel.

At the moment we do not recommend the use of this command with big events. Discord has a 50 channel limit per category so the channel creation category can get filled up very fast!

### E-Room Directory
Sometimes you need to use other systems to connect users, for example zoom or microsoft teams. If this is the case, E-Room Directory gives you the ability to add links for such rooms and you or a specified role can open and close such rooms. The different states have different message colors and when opened, a role can be notified.

This is commonly used for boothing when it happens over zoom rooms. When sponsor staff are on the room, they open the room and hackers get notified of the change.

### Activities and Workshops (WIP)
The bot has an extensive activity and workshop feature. More information will be added after an extensive review of the features.

## Technology Used
- Discord.js
- Node.js
- JavaScript
- Firebase Firestore

## History
This bot started as a personal project to be used at nwHacks 2021. However, after seeing all the features this bot could bring to other events, we decided to also use it for HackCamp 2020 and other nwPlus events.

After receiving a lot of support from hackers and mentors, @Maggie and I decided to make the code open source and work hard to make this bot accessible to small and medium hacakthons.

## Development
The bot is currently in development, we are constantly adding new features and improving current ones. For the next week or two we will stop work on any new features and concentrate on fixing all bugs!

## Open Source
### Need new features or found a bug?
Let us know by filing a ticket! We are always working on improving this bot to make it the best it can be!

### Contribute

## Creators
[JP Garcia](https://github.com/JPGarCar)

[Maggie Wang](https://github.com/mwang2000)
