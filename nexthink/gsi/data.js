/* Shared data for the GSI account files: Unisys and Stefanini.
   Each day item is tagged 'shared', 'unisys', or 'stefanini' so each
   account page can filter to what's actually relevant to it.

   Days 1-30 are Dustin's real onboarding plan. Days 31-90 are a DRAFT
   continuation I wrote using standard sales-onboarding milestones (QBR
   cadence, quota transition, pipeline review) since there's no real plan
   yet for that far out -- these are template placeholders to edit with
   actual specifics as they firm up, not verified fact the way 1-30 is. */

window.GSI_DRAFT_STARTS_DAY = 31;

window.GSI_DAYS = [
  {n:1, date:'Thu Oct 1', week:1, tag:null, items:[
    {t:'shared', text:'Systems and access setup: email, Salesforce, Slack/Teams, calendar'},
    {t:'shared', text:'Formal kickoff with Michael and Steve, review comp plan paperwork, confirm Q4 ramp structure in writing'},
    {t:'shared', text:"Ask directly for a copy of Paul's comp plan and target structure as a reference point"}]},
  {n:2, date:'Fri Oct 2', week:1, tag:null, items:[
    {t:'unisys', text:'Meet the UK-based regional lead who runs the European side of Unisys'},
    {t:'shared', text:'Meet the incoming Tampa-based technical Partner Service Manager (PSM)'},
    {t:'shared', text:"Get whatever Paul left behind: notes, CRM records, open deal status"},
    {t:'unisys', text:'Confirm Experience logistics and review the stakeholder directory before the room fills up'}]},
  {n:3, date:'Mon Oct 5', week:1, tag:'Experience Day 1', items:[
    {t:'unisys', text:'Meet Joel Raper and Morgan McCoy in person', subitems:['Joel Raper (CCO)', 'Morgan McCoy (SVP Global Sales & Alliances)']},
    {t:'unisys', text:'Use the room to start putting faces to names'}]},
  {n:4, date:'Tue Oct 6', week:1, tag:'Experience Day 2', items:[
    {t:'unisys', text:'Meet Patrycja Sobera and Chris Arrasmith', subitems:['Patrycja Sobera (GM, Digital Workplace Solutions)', 'Chris Arrasmith (COO)']},
    {t:'unisys', text:'Meet the Dell/Unisys relationship contacts and confirm the architecture lead', subitems:['John Backey (Dell/Unisys relationship)', 'Kim (Dell/Unisys relationship)', 'Tim Rashkin', 'CTO / solution-architecture lead']},
    {t:'unisys', text:'Represent well, this is the first big visible moment for the account'}]},
  {n:5, date:'Wed Oct 7', week:1, tag:'Experience Day 3', items:[
    {t:'unisys', text:'Wrap the event, collect follow-ups and action items from every conversation'},
    {t:'unisys', text:'Confirm what "supporting Unisys" looked like this week and what\'s expected going forward'}]},

  {n:6, date:'Thu Oct 8', week:2, tag:null, items:[
    {t:'unisys', text:'Send follow-up notes to everyone met at Experience'},
    {t:'unisys', text:'Log new contacts and open action items before they go stale'}]},
  {n:7, date:'Fri Oct 9', week:2, tag:null, items:[
    {t:'unisys', text:'First working session with US RevOps: pull the Unisys baseline, deployed-vs-licensed seats, renewal calendar, capability consumption, competitor presence, win-rate history'}]},
  {n:8, date:'Mon Oct 12', week:2, tag:null, items:[
    {t:'stefanini', text:'Same RevOps session for Stefanini: baseline, seats, renewals, capability consumption, competitors, win-rate'}]},
  {n:9, date:'Tue Oct 13', week:2, tag:null, items:[
    {t:'shared', text:"Meet Megan (GSI/MSP marketing), review what's already running for Unisys and Stefanini"},
    {t:'shared', text:'Confirm MEDDPICC enablement/training is scheduled'}]},
  {n:10, date:'Wed Oct 14', week:2, tag:null, items:[
    {t:'shared', text:"Week recap with Michael: Experience outcomes, baseline data progress, what's still missing"},
    {t:'shared', text:"Confirm whether the predecessor's ~$1.8M combined new-logo target (across both accounts) is the right anchor for your own number"}]},

  {n:11, date:'Thu Oct 15', week:3, tag:null, items:[
    {t:'shared', text:'Establish a standing weekly 1:1 with Michael if not already running'},
    {t:'unisys', text:'Apply the six-doors framework to Unisys by name: client director, CTO community contact, new business bid owner'}]},
  {n:12, date:'Fri Oct 16', week:3, tag:null, items:[
    {t:'stefanini', text:'Same door-mapping exercise for Stefanini: client director, key technical contact, new business bid owner'}]},
  {n:13, date:'Mon Oct 19', week:3, tag:null, items:[
    {t:'unisys', text:'Named-account intros to Unisys client directors, one page per account, introduction not a pitch'}]},
  {n:14, date:'Tue Oct 20', week:3, tag:null, items:[
    {t:'stefanini', text:"Same intro round for Stefanini's equivalent contacts"}]},
  {n:15, date:'Wed Oct 21', week:3, tag:null, items:[
    {t:'unisys', text:"Get on the CTO community's calendar, confirm their monthly cadence, aim to sit in on the next one as an observer"}]},

  {n:16, date:'Thu Oct 22', week:4, tag:null, items:[
    {t:'unisys', text:'From the capability-gap data, identify 2-3 named, specific upsell targets inside Unisys'}]},
  {n:17, date:'Fri Oct 23', week:4, tag:null, items:[
    {t:'stefanini', text:'Same exercise for Stefanini: 2-3 named, specific upsell targets'}]},
  {n:18, date:'Mon Oct 26', week:4, tag:null, items:[
    {t:'unisys', text:'Meet the bid desk / new business team lead, explore what it takes to get written into the reference architecture and standard SOW template'}]},
  {n:19, date:'Tue Oct 27', week:4, tag:null, items:[
    {t:'shared', text:'Working session with the Tampa PSM: align on delivery reporting cadence and how value gets shown quarterly'}]},
  {n:20, date:'Wed Oct 28', week:4, tag:null, items:[
    {t:'shared', text:"Mid-point check-in with Michael: what's tracking, what's stuck, anything he needs to unblock"}]},

  {n:21, date:'Thu Oct 29', week:5, tag:null, items:[
    {t:'unisys', text:'Draft version one of the Unisys account plan: base expansion, new-logo targets, Spark candidates, retention watch-points'}]},
  {n:22, date:'Fri Oct 30', week:5, tag:null, items:[
    {t:'stefanini', text:'Draft version one of the Stefanini account plan, same structure'}]},
  {n:23, date:'Mon Nov 2', week:5, tag:null, items:[
    {t:'shared', text:"Review both drafts with Michael and Steve, take the feedback, don't defend every number yet"}]},
  {n:24, date:'Tue Nov 3', week:5, tag:null, items:[
    {t:'shared', text:'Revise both plans based on feedback'},
    {t:'shared', text:'Loop Megan in on anything the plans surface that needs marketing support'}]},
  {n:25, date:'Wed Nov 4', week:5, tag:null, items:[
    {t:'shared', text:"Check both accounts for a healthcare-vertical fit for Spark, that's the easiest first conversation to have"}]},

  {n:26, date:'Thu Nov 5', week:6, tag:null, items:[
    {t:'shared', text:"Walk the revised plans past whoever sits in Ian's org as your field-alignment counterpart"}]},
  {n:27, date:'Fri Nov 6', week:6, tag:null, items:[
    {t:'shared', text:'Start scheduling a QBR cadence with client directors on both accounts'}]},
  {n:28, date:'Mon Nov 9', week:6, tag:null, items:[
    {t:'unisys', text:'Propose a quarterly cadence with Joel and Morgan for ongoing executive sign-off, not just a one-time intro'},
    {t:'shared', text:'Review any deals Paul left in flight on both accounts, confirm nothing is stalling from the handoff'}]},
  {n:29, date:'Tue Nov 10', week:6, tag:null, items:[
    {t:'shared', text:'Set formal 60-day and 90-day goals with Michael in writing'},
    {t:'shared', text:"Personal retro: what's working, what's still unclear, what needs escalating before Q1 quota starts"}]},
  {n:30, date:'Wed Nov 11', week:6, tag:'30-Day Review', items:[
    {t:'shared', text:'Day-30 review with Michael: present baseline data, both account plans, confirm alignment on the January 1 number'}]},

  // ---- DRAFT continuation below (days 31-90) -- not verified, edit freely ----
  {n:31, date:'Thu Nov 12', week:7, tag:null, items:[
    {t:'shared', text:'[DRAFT] Turn the reviewed account plans into a working pipeline: log every named upsell/new-logo target as an actual opportunity in Salesforce'}]},
  {n:32, date:'Fri Nov 13', week:7, tag:null, items:[
    {t:'unisys', text:'[DRAFT] First real pipeline conversation with the Unisys bid desk contact on one of the named upsell targets'}]},
  {n:33, date:'Mon Nov 16', week:7, tag:null, items:[
    {t:'stefanini', text:'[DRAFT] Same first real pipeline conversation for a named Stefanini target'}]},
  {n:34, date:'Tue Nov 17', week:7, tag:null, items:[
    {t:'shared', text:'[DRAFT] Confirm QBR dates are actually on the calendar with both client directors, not just proposed'}]},
  {n:35, date:'Wed Nov 18', week:7, tag:null, items:[
    {t:'shared', text:'[DRAFT] Weekly 1:1 with Michael: pipeline health check on both accounts'}]},

  {n:36, date:'Thu Nov 19', week:8, tag:null, items:[
    {t:'unisys', text:'[DRAFT] Sit in on the Unisys CTO community meeting as an observer, per the cadence confirmed in week 3'}]},
  {n:37, date:'Fri Nov 20', week:8, tag:null, items:[
    {t:'shared', text:'[DRAFT] Check in with the Tampa PSM on delivery reporting -- confirm the quarterly value narrative is actually coming together'}]},
  {n:38, date:'Mon Nov 23', week:8, tag:null, items:[
    {t:'unisys', text:'[DRAFT] First Unisys QBR, if scheduled this week -- bring the account plan, not just a status update'}]},
  {n:39, date:'Tue Nov 24', week:8, tag:null, items:[
    {t:'stefanini', text:'[DRAFT] First Stefanini QBR, same approach'}]},
  {n:40, date:'Wed Nov 25', week:8, tag:null, items:[
    {t:'shared', text:'[DRAFT] Debrief both QBRs with Michael: what resonated, what needs follow-up'}]},

  {n:41, date:'Mon Dec 1', week:9, tag:null, items:[
    {t:'shared', text:'[DRAFT] Push on the healthcare-vertical Spark conversation identified in week 5 -- get it to an actual meeting'}]},
  {n:42, date:'Tue Dec 2', week:9, tag:null, items:[
    {t:'unisys', text:'[DRAFT] Follow up on getting written into the Unisys reference architecture / standard SOW template'}]},
  {n:43, date:'Wed Dec 3', week:9, tag:null, items:[
    {t:'shared', text:'[DRAFT] Review win-rate and competitor data pulled in week 2 -- has anything shifted since baseline?'}]},
  {n:44, date:'Thu Dec 4', week:9, tag:null, items:[
    {t:'shared', text:'[DRAFT] Check pipeline coverage against the January 1 quota number -- identify any gap now while there\'s still time to act'}]},
  {n:45, date:'Fri Dec 5', week:9, tag:'60-Day Review', items:[
    {t:'shared', text:'[DRAFT] Day-60 review with Michael: pipeline built, QBRs run, gap (if any) against the Jan 1 target and the plan to close it'}]},

  {n:46, date:'Mon Dec 8', week:10, tag:null, items:[
    {t:'unisys', text:'[DRAFT] Work whatever deals are closable before year-end on Unisys -- push for signature, not just verbal commitment'}]},
  {n:47, date:'Tue Dec 9', week:10, tag:null, items:[
    {t:'stefanini', text:'[DRAFT] Same year-end push on closable Stefanini deals'}]},
  {n:48, date:'Wed Dec 10', week:10, tag:null, items:[
    {t:'shared', text:'[DRAFT] Confirm renewal calendar entries pulled in week 2 -- anything renewing in Q1 that needs attention now'}]},
  {n:49, date:'Thu Dec 11', week:10, tag:null, items:[
    {t:'shared', text:'[DRAFT] Loop Megan in on any deals that could use a marketing push before year-end'}]},
  {n:50, date:'Fri Dec 12', week:10, tag:null, items:[
    {t:'shared', text:'[DRAFT] Weekly 1:1 with Michael: year-end close status on both accounts'}]},

  {n:51, date:'Mon Dec 15', week:11, tag:null, items:[
    {t:'unisys', text:'[DRAFT] Executive check-in with Joel/Morgan per the quarterly cadence proposed in week 6'}]},
  {n:52, date:'Tue Dec 16', week:11, tag:null, items:[
    {t:'shared', text:'[DRAFT] Update both account plans with what actually closed vs. what was projected'}]},
  {n:53, date:'Wed Dec 17', week:11, tag:null, items:[
    {t:'shared', text:'[DRAFT] Start building the Q1 pipeline specifically -- new-logo and upsell targets for after quota starts'}]},
  {n:54, date:'Thu Dec 18', week:11, tag:null, items:[
    {t:'shared', text:'[DRAFT] Confirm territory/account assignments are still accurate heading into Q1'}]},
  {n:55, date:'Fri Dec 19', week:11, tag:null, items:[
    {t:'shared', text:'[DRAFT] Year-end wrap-up notes: what worked in the ramp, what to carry into Q1'}]},

  {n:56, date:'Mon Dec 29', week:12, tag:null, items:[
    {t:'shared', text:'[DRAFT] Back from the holiday break -- reconfirm the Q1 pipeline is still healthy and nothing slipped'}]},
  {n:57, date:'Tue Dec 30', week:12, tag:null, items:[
    {t:'shared', text:'[DRAFT] Final review of both account plans before quota goes live'}]},
  {n:58, date:'Wed Dec 31', week:12, tag:null, items:[
    {t:'shared', text:'[DRAFT] Ramp period ends today -- confirm final guaranteed-pay numbers with Michael'}]},
  {n:59, date:'Thu Jan 1', week:12, tag:'Quota Starts', items:[
    {t:'shared', text:'[DRAFT] Real quota number goes live'}]},
  {n:60, date:'Fri Jan 2', week:12, tag:'90-Day Review', items:[
    {t:'shared', text:'[DRAFT] Day-90 review with Michael: full ramp retro, Q1 pipeline walkthrough, confirmed targets for both accounts going forward'}]},
];

window.GSI_WEEK_LABELS = {
  1:'Land, Then Straight Into Experience', 2:'Follow Up, Then Build the Baseline', 3:'Map the Terrain',
  4:'Turn Data Into Named Targets', 5:'Draft the Plan', 6:'Close the Month',
  7:'[Draft] Pipeline From the Plan', 8:'[Draft] First QBRs', 9:'[Draft] Push Toward 60 Days',
  10:'[Draft] Year-End Close', 11:'[Draft] Executive Cadence & Q1 Prep', 12:'[Draft] Quota Goes Live',
};

window.GSI_STAKEHOLDERS = {
  nexthink: {
    confirmed: [
      {name:'Michael McCrum', title:'Global Sales Director, GSI & MSP, Nexthink', linkedin:'https://uk.linkedin.com/in/michael-mccrum-02251517', note:'Your sponsor/hiring manager. Nexthink lifer in the MSP business: ran Global MSP sales 2016-2021, left for UiPath, came back in 2023, promoted to Global Sales Director in January 2025.'},
      {name:'Steve Little', title:"SVP Global MSP's, Channel & Alliances, Nexthink", linkedin:'https://uk.linkedin.com/in/stevenlittle100', note:"Michael's boss. Long-tenured Nexthink channel strategist, been in MSP/channel leadership roles at Nexthink since 2012."},
      {name:'Matt Jacques', title:'Senior Director, MSP Technical Services, Nexthink', note:'Previously ran Partner Success for Global MSP (2024-2025), came from Atos before that -- has lived inside a GSI delivery organization himself.'},
      {name:'Ian Bancroft', title:'Chief Revenue Officer, Nexthink', note:'CRO since 2023. Previously SVP & CRO at Secureworks, and before that a decade-plus at HPE across global account and services sales leadership.'},
    ],
    pending: [
      {name:'Megan', title:'GSI/MSP marketing', note:'Last name not yet confirmed. Point of contact for marketing support on both the Unisys and Stefanini accounts.'},
      {name:'Tampa-based technical PSM', title:'Partner Service Manager', note:'Name not given on the call, incoming into the role -- confirm in person.'},
      {name:'UK-based regional lead', title:'Runs the European side of the Unisys relationship', note:'Name not given on the call -- confirm in person or via Michael.'},
      {name:"Field-alignment counterpart in Ian's org", title:'Unnamed on the call', note:"Referenced as the person to walk account plans past for field alignment -- confirm name directly with Michael."},
    ]
  },
  unisys: {
    confirmed: [
      {name:'Joel Raper', title:'Senior Vice President & Chief Commercial Officer, Unisys', linkedin:'https://www.linkedin.com/in/joel-raper-5020063/', note:"Oversees sales and client management as Unisys's go-to-market leader. One of the two SVPs expected at Experience."},
      {name:'Morgan McCoy', title:'Senior Vice President, Global Sales & Alliances, Unisys', linkedin:'https://www.linkedin.com/in/morgan-mccoy-9b387321/', note:'Based in Lake Forest, IL. Joined Unisys in 2024 from Avanade. The other SVP expected at Experience.'},
      {name:'Tim Costigan', title:'Leads new-logo growth, USA & Canada, Unisys', linkedin:'https://www.linkedin.com/in/timacostigan/', note:'Based in Minneapolis. Matches the VP/sales director for new logo across the Americas.'},
      {name:'Patrycja Sobera', title:'SVP & General Manager, Digital Workplace Solutions, Unisys', linkedin:'https://www.linkedin.com/in/patrycjasobera/', note:'The real name behind what was transcribed as "Patricia Cabaro." Leads a team of 6,000+ globally.'},
      {name:'Chris Arrasmith', title:'Executive Vice President & Chief Operating Officer, Unisys', linkedin:'https://www.linkedin.com/in/chris-arrasmith/', note:'Almost certainly who was transcribed as "Chris Smith, CRO." Confirmed via Unisys executive officer filing.'},
    ],
    pending: [
      {name:'John Backey', title:'Runs the Dell relationship for Unisys', note:'No verified LinkedIn match yet, confirm spelling with Michael or in person at Experience.'},
      {name:'Kim', title:'Unisys partner manager, Dell/Turner relationship', note:'No last name given on the call, cannot verify yet.'},
      {name:'Tim Rashkin', title:'Global offering (per the call)', note:'Audio quality made this hard to catch clearly, confirm in person.'},
      {name:'CTO / solution-architecture lead', title:'Name unclear on the call', note:'Confirm name and title in person at Experience.'},
    ]
  },
  stefanini: {
    confirmed: [],
    pending: []
  }
};
