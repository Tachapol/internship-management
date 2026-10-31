import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from 'database';

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Create a new team',
    description: 'Creates a new engineering team under a company (Super Admin / BD Team only).',
  })
  @ApiResponse({ status: 201, description: 'Team created successfully.' })
  async create(
    @Body() createDto: CreateTeamDto,
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.teamsService.createTeam(createDto, currentUser);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get list of teams',
    description: 'Returns a paginated list of teams belonging to the company with member counts.',
  })
  @ApiQuery({ name: 'companyId', required: false, type: String, description: 'Filter teams by company ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'List of teams returned successfully.' })
  async findAll(
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
    @Query('companyId') companyId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters = {
      companyId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };
    return this.teamsService.getTeamsList(filters, currentUser);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get details of a specific team',
    description: 'Retrieves full details of a team including members and mentors.',
  })
  @ApiResponse({ status: 200, description: 'Team details retrieved.' })
  @ApiResponse({ status: 404, description: 'Team not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.teamsService.getTeamDetails(id, currentUser);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Update team details',
    description: 'Updates team name or details (Super Admin / BD Team only).',
  })
  @ApiResponse({ status: 200, description: 'Team updated successfully.' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTeamDto,
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.teamsService.updateTeam(id, updateDto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({
    summary: 'Delete a team',
    description: 'Removes a team if it has no active students or mentors (Super Admin / BD Team only).',
  })
  @ApiResponse({ status: 200, description: 'Team deleted successfully.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.teamsService.deleteTeam(id, currentUser);
  }
}
