---
title: "MySQL: Created and Modified Date Fields"
date: 2009-12-30T22:22:00-05:00
---

I've been searching for an efficient way to set created and modified date fields in MySQL. Of course, this can be done in the application you're writing, however, I wanted to find a way to automatically do this on the database layer.

Please note, this approach is targeted for MySQL 5.0+.

The approach I take here is a combination of using the [TIMESTAMP](http://dev.mysql.com/doc/refman/5.0/en/timestamp.html) field data type and a `TRIGGER`.

<!-- more -->

**IMPORTANT:** When using multiple `TIMESTAMP` fields in a table, there can be only one `TIMESTAMP` column with `CURRENT_TIMESTAMP` in `DEFAULT` or `ON UPDATE` clause. This is why we need to use a `TRIGGER` to update one of the fields values.

In our case, we will set the `date_modified` field to contain the `DEFAULT` of `CURRENT_TIMESTAMP` and also set the `ON UPDATE` clause to `CURRENT_TIMESTAMP`.

```sql
CREATE TABLE `temp` (
  `field_value` VARCHAR(100) NOT NULL,
  `date_created` TIMESTAMP NULL DEFAULT NULL,
  `date_modified` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
ENGINE = InnoDB;
```

If you noticed in the `CREATE TABLE` snippet above we use the `TIMESTAMP` features on the `date_modified` field, but set our `date_created` field to `NULL` by default. We do this because our `TRIGGER` will populate the value before the insert.

```sql
DELIMITER //

CREATE TRIGGER temp_before_insert_created_date BEFORE INSERT ON `temp`
FOR EACH ROW
BEGIN
  SET NEW.date_created = CURRENT_TIMESTAMP;
END//
DELIMITER ;
```

In our trigger, we simply set the `date_created` value to the `CURRENT_TIMESTAMP`.

Now you will be able to insert and update rows in your table without having to specify the `date_created` or `date_modified` values.

```sql
INSERT INTO `temp` (field_value) VALUES ('testing');
UPDATE `temp` SET field_value = 'testing1';
```

Another approach that can be used is by setting the `date_created` value to `NULL` when inserting a row. This involves a different `CREATE TABLE` syntax.

```sql
CREATE TABLE `temp` (
  `field_value` VARCHAR(100) NOT NULL,
  `date_created` TIMESTAMP NOT NULL DEFAULT '0000-00-00 00:00:00',
  `date_modified` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
ENGINE = InnoDB;
```

Notice our `date_created` field is now set to `NOT NULL` with a default value of `0000-00-00 00:00:00`. Here's an important note from the documentation:

TIMESTAMP columns are NOT NULL by default, cannot contain NULL values, and assigning NULL assigns the current timestamp.

In other words, when we insert and set the value to `NULL` on a `TIMESTAMP` field, it will insert the current timestamp.

An example insert/update statement would look like:

```sql
INSERT INTO `temp` (field_value, date_created) VALUES ('testing', NULL);
UPDATE `temp` SET field_value = 'testing1';
```

This approach allows us to avoid using triggers, however requires you to specify the `NULL` value when the query is executed.