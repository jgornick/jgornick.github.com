---
title: "MongoDB Unique Indexes on Single/Embedded Documents"
date: 2012-10-25T01:13:00-05:00
---

MongoDB doesn't support unique indexes on embedded documents **in the same document**. However, it does support some scenarios for adding [unique indexes](http://www.mongodb.org/display/DOCS/Indexes) on embedded documents. When you apply a unique index to an embedded document, MongoDB treats it as unique in the collection. The following is an example of setting up a unique index on an embedded document:

<!-- more -->

```
use bugs;

db.issues.ensureIndex({ title: 1 }, { unique: true });
db.issues.ensureIndex({ "tasks.title": 1 }, { unique: true, sparse: true });

// add an issue with a task
db.issues.insert({ title: "Issue1", tasks: [ { title: "Task1" } ] });

// add another issue with a task and the same title
db.issues.insert({ title: "Issue2", tasks: [ { title: "Task1" } ] });
```

When you run the last insert statement, you will receive ```E11000 duplicate key error index: bugs.issues.$tasks.title_1  dup key: { : "Task1" }``` This is because you are trying to insert an embedded task in the issues collection with the same title.

Let's say you wanted to allow a task with the same title embedded in another issue. In order to accomplish this, you need to create a compound index.

```
use bugs;

db.issues.ensureIndex({ title: 1 }, { unique: true });
db.issues.ensureIndex({ title: 1, "tasks.title": 1 }, { unique: true, sparse: true });

// add an issue with a task
db.issues.insert({ title: "Issue1", tasks: [ { title: "Task1" } ] });

// add another issue with a task and the same title
db.issues.insert({ title: "Issue2", tasks: [ { title: "Task1" } ] });
```

With our compound index, we can now add a task with the same title in different documents.

## Single Document Unique Indexes

We've covered embedded unique indexes for the collection and over multiple documents. However, what about the scenario for only allowing unique tasks on a single document? Let's take a look at the following example:

```
use bugs;

db.issues.ensureIndex({ title: 1 }, { unique: true });
db.issues.ensureIndex({ title: 1, "tasks.title": 1 }, { unique: true, sparse: true });

// add an issue with a task
db.issues.insert({ title: "Issue1", tasks: [ { title: "Task1" } ] });

// add another task to the issue with the same title
db.issues.update({ title: "Issue1" }, { $push: { tasks: { title: "Task1" } } });
```

Would you expect the last update statement to return a unique error or add another task with the same title? As of MongoDB 2.2, the task is **added**.

There has been an [issue open since April of 2010](https://jira.mongodb.org/browse/SERVER-1068). It's simply because the original design of unique indexes were document based and not targeted for embedded documents.

## Workarounds

There are some workarounds to preventing duplicated data from being added to an embedded collection. It's important to note the workarounds don't utilize a unique index, but rather use existing features to prevent duplicate data from being inserted.

One of the workarounds is [described by Kyle Banker](https://groups.google.com/d/msg/mongodb-user/uaiPPLcjJjY/QpNy54kdokkJ) in the mongodb-user group. Kyle's workaround specifies a detailed query to only update a document if it does not contain an embedded document value:

```
db.issues.update(
  { title: "Issue1", "tasks.title": { $ne: "Task1" } },
  { $push: { tasks: { title: "Task1" } } }
);
```

The previous update statement will only add a task with the title of "Task1" if the issue doesn't contain one already. This approach is good for simple scenarios, but when you have multiple fields and potentially multiple levels of embedded documents, the condition becomes quite large.

Another workaround is to use the [$addToSet](http://www.mongodb.org/display/DOCS/Updating#Updating-%24addToSetand%24each) modifier operation. This operation will add a value to an array only when the value doesn't already exist. The following is an example of adding a task with the same title:

```
db.issues.update({ title: "Issue1" }, { $addToSet: { tasks: { title: "Task1" } } });
```

The previous statement will add the task to the issue if it doesn't exist. You can also add many values in a single operation when using the $each qualifier:

```
db.issues.update(
  { title: "Issue1" },
  { $addToSet: { tasks: { $each: [{ title: "Task1" }, { title: "Task2" }] } } }
);
```

The two listed workarounds are targeted at adding unique embedded documents. Without single-document unique indexes, you are unable to enfore uniqueness during the update. This means we could rename the task with the title of "Task1" to "Task2" without causing an error. This is unexpected behavior.

Since the workarounds don't utilize a unique index, an error is never thrown. This behavior could be beneficial to applications wanting to notify the user of inserting duplicated data. The workarounds are more of a "set it and forget it" update.

The following statements and comments are a summary of the current behavior and expected results:

```
use bugs;

db.issues.ensureIndex({ title: 1 }, { unique: true });
db.issues.ensureIndex({ title: 1, "tasks.title": 1 }, { unique: true, sparse: true });

// insert our initial issue with a single task
db.issues.insert({ title: "Issue1", tasks: [ { title: "Task1" } ] });

// the following add or set a duplicate task, however, expected result would be
// a unique index violation error
db.issues.update({ title: "Issue1" }, { $push: { tasks: { title: "Task1" } } });
db.issues.update({ title: "Issue1" }, { $pushAll: { tasks: [ { title: "Task1" } ] } });
db.issues.update({ title: "Issue1" }, { $set: { tasks: [ { title: "Task1" }, { title: "Task1" } ]} });

// the following do not allow a duplicate task to be added
db.issues.update({ title: "Issue1" }, { $addToSet: { tasks: { title: "Task1" } } });
db.issues.update({ title: "Issue1" }, { $addToSet: { tasks: { $each: [ { title: "Task1" }, { title: "Task1" } ] } } });

// this should throw a unique index violation error and not insert a new issue with duplicate tasks
db.issues.insert({ title: "Issue5", tasks: [ { title: "Task1" }, { title: "Task1" } ] });
```
## Possible Solutions

I haven't found any proposed solutions to allow unique indexes on embedded documents. After digging into this, I've come up with two:

##### Create a new index creation option for single document

This approach would allow a user to specify a new creation option in the ensureIndex method. You would be able to only apply this creation option on embedded field paths. An example would be:

```
db.issues.ensureIndex({ "tasks.title": 1 }, { docUnique: true });
```

The previous statement would add a unique index on a task title for each document. This would then throw a unique index violation error if you tried to add or update a task title to an existing title.

##### Allow a positional-like operator when defining the path of the index

This would allow a user to define the path to a field using a ```$``` as an identifier representing embedded documents.

```
db.issues.ensureIndex({ "tasks.$.title": 1 }, { unique: true });
```

The previous statement would add the same type of index as the previous solution, but using a different notation.

## Unique Arrays

One last thing to note, and it's important; this article focuses only on embedded documents. However, the unique index applies more natively to arrays. This means that you can't apply a unique index so an array can contain unique values. In the following example, you are allowed to have the same values in an array:

```
use foo;

db.bookmarks.ensureIndex({ tags: 1 }, { unique: true, sparse: true });
db.bookmarks.insert({ title: "Bookmark1", tags: ["tag1", "tag2", "tag3"] });
db.bookmarks.update({ title: "Bookmark1" }, { $push: { tags: "tag1" } });
```

The last statement will add "tag1" to the list of tags again. The expected result would be that tags are unique.

I hope I haven't murdered this too badly. Comments are welcome!
