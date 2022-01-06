# obsidian-pattern-tracking

> Track progress through patterns of activity

Life is weird. So is managing what we're doing and what we've accomplished.

I don't know about you, but personally, I can't _stand_ manually tracking everything. Sure, it doesn't take long to do, but for me, it always seems to take _far_ too much time away from what I'm **trying** to track—like current progress on my stories.

Incidentally, that's also the motivation for why I started making this. I use dataview to help aggregate some data on what I've written; for instance, it helped **immensely** when I sat down to type up my [thoughts on participating in my first NaNoWriMo](https://hartwellto.me/ObNaNo/ObNaNo+2021+Insights).

However, I didn't really have a way to track their status. I tried to add in a status property for this, but rarely updated it; enough files don't even have it to safely say that I don't actually use it. By the end of 2021, it was pretty clear to me that I needed a way to fix this.

Rather than trying to figure out how to change my process, however, I wanted something to work _with_ it. Something that could use my activity to help estimate the status of a story based on patterns of activity.

Something that didn't need me to change what I'm doing to offer me some insight into their status.

Rather than hunting down a new tool to try, I wrote down my process, then got to work figuring out how to make something work with it. Considering how heavily I use Obsidian and its modularity, I chose to focus on utilizing dataview for this, too—and it's paying off already.

## Installing

Because this relies on the [Dataview plugin](https://blacksmithgu.github.io/obsidian-dataview/), you'll need to install that for Obsidian first.

For now, there are two means of installing the tracker: [as a dataviewjs block](#as-dataviewjs-block) or [as a dataview view](#as-dataview-view).

### as a dataviewjs block

Copy the code from [the view](./views/pattern-tracking/view.js) and paste it into a dataviewjs block.

### as a dataview view

Save both `view.js` and `view.css` to their own folder within your vault (I used `views/pattern-tracking`).

## Using pattern-tracking

With pattern-tracking installed in your vault, you can start making use of it! All you need is the input, conveniently with an object ready near the top of the view's code:

```js
const input = {
  filter: '-"~META"',
  typeKey: 'Type',
  type: 'story',
  subtypeKey: 'Subtype',
  subtypes: ['side-story', 'thought']
}
```

> NOTE: See the [dataview view example](#dataview-view-example) below for more information.

Please note that, for now, pattern-tracking expects two subtypes, and provides no logic or support for other cases right now. This is high on my list, however; currently, the logic is designed to support only two subtypes.

For Nowᵀᴹ, the logic depends on some things that I'll decouple from my process as soon as possible:

1. The status names and their respective colors are hard-coded in. (The colors also reference ones from my theme for now.)
2. Not Ready status is determined by the file's location in a `WIP` folder by default.
3. Any folder can be the Ready location.
4. Both subtypes can determine the Not Ready stage.
5. Only the second subtype is used to determine the Ready stage.

The first three will be relatively easy to correct, and should be available SOONᵀᴹ as configuration options. The remaining two will take more time, however, as I'll need to create ways to build the logic from the input.

### dataview view example

Note: Remove the backslashes from the copied code for a working dataviewjs block.

```js
\`\`\`dataviewjs
const input = {
  filter: '-"~META"',
  typeKey: 'Type',
  type: 'story',
  subtypeKey: 'Subtype',
  subtypes: ['side-story', 'thought']
}

dv.view('path/to/pattern-tracking', input)
\`\`\`
```
