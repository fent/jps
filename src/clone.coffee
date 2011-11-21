# clones an object along with its properties
clone = module.exports = (obj) ->
  # Hanlde the 3 simple types, and null or undefined
  if null == obj or 'object' != typeof obj then return obj

  # Handle Date
  if obj instanceof Date
    copy = new Date()
    copy.setTime obj.getTime()

  # Handle Array
  else if obj instanceof Array
    copy = []
    for i, val of obj
      copy[i] = clone val

  # Handle Object
  else if obj instanceof Object
    copy = {}
    for own attr, val of obj
      copy[attr] = clone val
  else
    throw new Error 'Unable to copy obj! Its type isn\'t supported.'

  copy
