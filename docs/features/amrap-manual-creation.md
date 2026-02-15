# AMRAP Workout Type Selection - Manual Creation

## Overview
Added the ability for users to specify AMRAP (As Many Rounds As Possible) workout type and time limit when manually creating workouts, before AI enhancement.

## Implementation Details

### Location
**File**: `src/app/add/page.tsx`

### Changes Made

#### 1. New State Variables
```typescript
const [workoutType, setWorkoutType] = useState<'regular' | 'amrap'>('regular')
const [amrapTimeLimit, setAmrapTimeLimit] = useState<number>(12) // Default 12 minutes
```

#### 2. New Imports
Added UI components for the form:
- `Label` from `@/components/ui/label`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `@/components/ui/select`

#### 3. UI Components Added

**Workout Type Selector**
- Dropdown select with two options:
  - "Regular" (default)
  - "AMRAP (As Many Rounds As Possible)"
- Placed after the Workout Title field
- Helper text explaining the format

**Time Limit Input (Conditional)**
- Only shown when AMRAP is selected
- Number input field for minutes (1-120 range)
- Default: 12 minutes
- Validation: Ensures value stays within 1-120 range
- Styled with primary color highlighting
- Includes explanatory text about AMRAP format

**UI/UX Features**
- Conditional rendering using `{workoutType === 'amrap' && ...}`
- Highlighted container with primary color background/border
- Clear labels and helper text
- Proper input validation with min/max constraints
- Accessible form elements with proper `id` and `htmlFor` attributes

#### 4. Save Flow Integration

Modified `handleParseWorkout` function to include AMRAP data:

```typescript
// Add AMRAP data to llmData if AMRAP is selected
if (workoutType === 'amrap' && workoutToEdit) {
  workoutToEdit = {
    ...workoutToEdit,
    workoutType: 'amrap',
    structure: {
      timeLimit: amrapTimeLimit * 60 // Convert minutes to seconds
    }
  }
}
```

**Data Flow:**
1. User selects AMRAP workout type
2. User enters time limit in minutes
3. When saving, time is converted to seconds
4. Data is stored in `llmData` object with:
   - `workoutType: 'amrap'`
   - `structure.timeLimit: <seconds>`
5. Passed to edit page via sessionStorage
6. Edit page reads AMRAP data and displays accordingly

### Integration Points

#### Edit Page Compatibility
The edit page (`src/app/add/edit/page.tsx`) already handles AMRAP workouts:
```typescript
// Load AMRAP data
if (data.llmData?.workoutType === 'amrap') {
  setWorkoutType('amrap')
  const timeLimitSeconds = data.llmData?.structure?.timeLimit || 1200
  setAmrapTimeLimit(timeLimitSeconds)
}
```

#### Save to Database
When saving to DynamoDB, the workout includes:
```typescript
workoutType: workoutType,
structure: workoutType === 'amrap' ? {
  timeLimit: amrapTimeLimit
} : workoutStructure,
```

#### Type Definitions
Uses existing AMRAP types from `src/types/amrap.ts`:
```typescript
export interface AMRAPWorkout {
  workoutType: 'amrap'
  structure?: {
    timeLimit?: number // seconds
  }
  exercises?: Exercise[]
}
```

### Validation

**Time Limit Validation**
- Minimum: 1 minute
- Maximum: 120 minutes
- Real-time validation on input change
- Automatically clamps values to valid range

**Form Validation**
- Existing validation ensures title and content are required
- AMRAP-specific fields only required when AMRAP is selected

### User Experience

**Default State**
- Workout type: Regular
- AMRAP time limit: 12 minutes (only visible when AMRAP selected)

**Visual Feedback**
- AMRAP section highlighted with primary color
- Clear formatting explanation
- Placeholder text in workout content field shows example exercises
- Character count for content field

**Progressive Disclosure**
- Time limit input only appears when AMRAP is selected
- Reduces visual clutter for regular workouts
- Provides context-specific guidance

### Backward Compatibility

**Existing Features Maintained**
- URL/Social import still works
- Image/OCR import still works
- Manual text entry still works
- AI enhancement button still functional
- All existing workout types supported

**No Breaking Changes**
- Regular workouts continue to work as before
- AMRAP data is additive, doesn't affect regular workflows
- Existing saved workouts unaffected

### Testing Scenarios

1. **Create Regular Workout**
   - Select "Regular" type
   - Enter title and content
   - Save → Should create standard workout

2. **Create AMRAP Workout**
   - Select "AMRAP" type
   - Set time limit (e.g., 15 minutes)
   - Enter exercises
   - Save → Should create AMRAP workout with 900 second time limit

3. **Validation**
   - Try entering time limit < 1 → Should clamp to 1
   - Try entering time limit > 120 → Should clamp to 120
   - Leave title/content empty → Save button should be disabled

4. **AI Enhancement**
   - Create AMRAP workout
   - Use AI enhancement button
   - Verify AMRAP data persists after enhancement

### Future Enhancements

**Potential Improvements**
- Preset time limits (10, 12, 15, 20 minutes)
- Time limit suggestions based on exercise count
- Preview of what the AMRAP session will look like
- Multi-block AMRAP support in manual creation
- Round count estimation based on exercises

**Related Features**
- AMRAP session view integration (already implemented)
- AMRAP display in workout cards (already implemented)
- Multi-block AMRAP support (partially implemented)

### Documentation References

**Related Files**
- `src/app/add/page.tsx` - Manual workout creation (modified)
- `src/app/add/edit/page.tsx` - Workout editing
- `src/types/amrap.ts` - AMRAP type definitions
- `src/components/workout/amrap-*.tsx` - AMRAP display components

**Type Safety**
- All TypeScript types properly defined
- No type errors introduced
- Follows existing code patterns

### Deployment Notes

**Build Status**
- ✅ TypeScript compilation successful
- ✅ No build errors
- ✅ No runtime warnings expected
- ✅ Backward compatible

**Dependencies**
- No new dependencies added
- Uses existing UI components
- Leverages existing AMRAP infrastructure

---

**Implementation Date**: 2025-12-16
**Status**: ✅ Complete and tested
