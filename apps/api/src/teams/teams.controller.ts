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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a new team (Admin/BD only)' })
  async create(
    @Body() createDto: CreateTeamDto,
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.teamsService.createTeam(createDto, currentUser);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM, UserRole.MENTOR, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get list of teams' })
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
  @ApiOperation({ summary: 'Get details of a specific team' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.teamsService.getTeamDetails(id, currentUser);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({ summary: 'Update team details (Admin/BD only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTeamDto,
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.teamsService.updateTeam(id, updateDto, currentUser);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BD_TEAM)
  @ApiOperation({ summary: 'Delete a team (Admin/BD only)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() currentUser: { id: string; role: UserRole; companyId?: string },
  ) {
    return this.teamsService.deleteTeam(id, currentUser);
  }
}
