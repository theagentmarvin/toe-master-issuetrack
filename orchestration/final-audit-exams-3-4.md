# FINAL AUDIT B — Official Exam 3 & 4 Requirements vs Submitted Apps

**Auditor:** qa-marvin (independent, fresh extraction from people.thatopen.com) · **Date:** 2026-10-31 15:4x GMT-3
**Targets:** Exam 3 `https://issuetrack-v3.web.app` · Exam 4 `https://issuetrack-v4.web.app`
**Method:** own new CDP tab on the managed Chrome (127.0.0.1:18800); real mouse/keyboard Input events; Firestore REST for state assertions. No synthetic `dispatchEvent`.

**VERDICT: _pending_**

---

## 1. Official requirements — verbatim extraction

Source pages (both accessed 2026-10-31, logged-in session, lesson body text):

- Exam 3: https://people.thatopen.com/c/creating-reactive-apps/sections/137331/lessons/468287 — "Creating Reactive Apps Challenge"
- Exam 4: https://people.thatopen.com/c/creating-bim-apps-0cfd57/sections/342855/lessons/2795105 — "Creating BIM Apps Challenge"

### Exam 3 — verbatim

> Create a Project Form Component
>
> As you have seen, during the lessons we included the form directly in the ProjectsPage. While that is ok because there is where it will be mostly used, it comes with a couple of downsides:
> - It makes the ProjectsPage component to grow in size, making it harder to maintain.
> - It fails to follow the Single Responsability Principle.
> - It is impossible to use the form in other places of the app other than the ProjectsPage it-self.
>
> Your task is to create a dedicated ProjectsForm component that can both create and update projects locally and in Firebase. Finally, you must include it as a nested component in all other components you see it fits.
>
> Create the ToDo components
>
> As the title implies, you will have to create the corresponding components for the ToDo functionality in the application. The goal is to:
> - Define a main component to hold the list of ToDo cards in the Project Details Page. You can name the component as you like, but something as ProjectTasksList would be a good name.
> - Create the ToDo card component. You can use the same UI done in previous modules as a starting point, but update it to display the status and priority. Also, make sure to give different colors to each priority and status.
> - Inside the ProjectTasksList, integrate the general SearchBox component we did during the lessons implemented in such a way that can filter the list of ToDo Cards.
> - Create a Todo Form Component and make it work so it can create ToDos and update the ProjectTasksList. This form not only serves the purpose of creating new ToDos, but also to update them.
>
> Store ToDos in Firebase
>
> Make sure to store the ToDos created in Firestore. Obviously, the goal is not only to store them, but also to retrieve them when the project enters a project.
>
> How to submit the challenge?
>
> Easy! The only thing you need to do is deploy your app to the web and share the link in a dedicated form. [...]

### Exam 4 — verbatim

> Items Finder UI
>
> Create a user interface for the Items Finder that is able to retrieve all items that matches a particular propety value in a specific property set.
>
> An important skill any software developer must have, is to read documentation to implement new features in the app. For this mini challenge, you should read the https://docs.thatopen.com/api/@thatopen/components/classes/ItemsFinder documentation to know how to serialize (export/import) queries. You must create two buttons in the user interface: one to download the existing queries, another one to upload previously downloaded queries.
>
> Colors Palette UI
>
> Remember the colorize button we did during this module? Yes, the one that changes the selection color. Add a colors palette to it so users can select from predefine colors to change the item visualization quicker.
>
> Data Enhancer
>
> For the custom Data Enhancer component we did in the module, work on a new method that based on the data from the source finds all items sharing the same information. For example: if the source contains information about the technical documentation of construction items, create a method in the component that returns all items with the same documentation.
>
> Smart Views
>
> An important part of any application is the ability to serialize information, that is, to export data and import it back again. In fact, we have made it with the Projects way back in the master! Your job is to create serialization methods in the custom SmartViews component to be able to export and import SmartViews. TIP: You don’t need to export an image or something, you need to export the definition of the SmartView so when you import a View it can be recreated again as if the user has made it in the same working session.
>
> With the serialization methods already in place for the SmartViews component, find a way to store the smart views information in Firebase as part of the project data. Also, if you already have smart views stored in the Firebase project, make sure they show in the UI when a project is opened.
>
> Finally, add a new update button in the SmartView Table UI to update views based on the current state. In other words, if you apply a Smart View and then make some query colorization changes, you should be able to update the Smart View by clicking a button in the UI.
>
> How to submit the challenge?
>
> Easy! The only thing you need to do is deploy your app to the web and share the link in a dedicated form. [...]

### Requirement IDs used below

| ID | Requirement (condensed, faithful) |
|----|----------------------------------|
| E3-1 | Dedicated `ProjectsForm` component, separate from ProjectsPage |
| E3-2 | ProjectsForm can **create** projects locally and in Firebase |
| E3-3 | ProjectsForm can **update** projects locally and in Firebase |
| E3-4 | ProjectsForm nested/reused in other components where it fits |
| E3-5 | Main component holding the list of ToDo cards in Project Details Page (e.g. ProjectTasksList) |
| E3-6 | ToDo card component displaying **status and priority**, with **different colors per priority and per status** |
| E3-7 | SearchBox integrated **inside** ProjectTasksList, filtering the ToDo cards |
| E3-8 | TodoForm component that **creates** ToDos and updates the list |
| E3-9 | Same TodoForm **updates** existing ToDos |
| E3-10 | ToDos stored in **Firestore** |
| E3-11 | ToDos retrieved when entering a project |
| E3-12 | App deployed to the web / link submitted |
| E4-1 | Items Finder UI: retrieve all items matching a particular **property value in a specific property set** |
| E4-2 | Two UI buttons: **download** existing queries, **upload** previously downloaded queries (per ItemsFinder docs serialization) |
| E4-3 | **Colors palette** added to colorize, predefined colors |
| E4-4 | Data Enhancer: new method returning **all items sharing the same information** from the source (e.g. same documentation) |
| E4-5 | SmartViews **serialization methods** export + import (definition, recreatable) |
| E4-6 | SmartViews stored in **Firebase as part of the project data**; shown in UI when project opens |
| E4-7 | New **update button in SmartView Table** updating a view from current state |
| E4-8 | App deployed to the web / link submitted |

---

## 2. Audit log (item by item)

_(filled in below, incrementally)_
